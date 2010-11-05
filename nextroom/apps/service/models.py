#########################################################
# Imports
#########################################################

from django.contrib.auth.models import get_hexdigest, check_password
from django.db import models
from django.db.models.signals import post_save
from django.forms.fields import email_re
from django.utils.hashcompat import md5_constructor, sha_constructor

from nextroom.apps.service.customfields import ColorField

import datetime
import hashlib


#########################################################
# Deprecated methods
#########################################################

def create_dummy_version(type):
    version_number = "X" * 32
    return Version.objects.create(versionNumber=version_number, lastChange=datetime.datetime.now(), type=type)

def increment_version(version):
    """
        Calculate and change the version row
    """

    version.lastChange = datetime.datetime.now()
    m = hashlib.md5()
    m.update(str(version.lastChange))
    version.versionNumber = m.hexdigest()
    version.save()

    return version


def increment_type_version(type):
    """
        Increment version based upon type
    """
    try:
        # Should only be one, but we'll get the most recent just to be sure
        version = Version.objects.filter(type=type).order_by("-lastChange")[0]
    except IndexError:
        version = create_dummy_version(type)

    version = increment_version(version)

    return version


def increment_user_version(user):
    """ Increment the version row for a user.
    
    """
    try:
        version = user.version
    except Version.DoesNotExist:
        # Just create a dummy row, it's going to be changed
        version = create_dummy_version('user')

    version = increment_version(version)
    user.version = version
    user.save()

    return version

#########################################################
# Expose models for easy API access
#########################################################

PUBLIC = {}

def public(cls):
    """ Used by the model_method decorator to look up class name based on URL arg.
    
    """
    PUBLIC[cls.__name__.lower()] = cls
    return cls

#########################################################
# Private Base & Helper Models
#########################################################

class ApiModel(models.Model):
    """ Base API Model
    Implements shared elements & interfaces required for interacting
    with the API. If the item needs to be used by the app or admin site,
    subclass APIModel -- Practice is the only exception
    
    """
    practice = models.ForeignKey('Practice', blank=False, null=False)
    name = models.CharField(max_length=256)
    sort_order = models.IntegerField(default=0, blank=True)
    
    # Empty dict for errors -- see comments in validate() method
    errors = {}
    
    class Meta:
        abstract = True
        ordering = ('sort_order', 'name')
    
    def __unicode__(self):
        return self.name
    
    def small_dict(self):
        # Returns small dict of basic item attributes
        d = {}
        d['name'] = self.name
        d['uri'] = self.uri
        d['special'] = self._is_special()
        return d
    
    def _is_special(self):
        # Currently only used by User model (and overridden there)
        # This is used to currently mark items as system items that cannot be deleted
        # If another model needs to use this, override for that class
        return False
    
    def _item_uri(self):
        # Return an item URI for API access
        return 'app/%s/%d' % (self.__class__.__name__.lower(), self.id)
    uri = property(_item_uri)
    
    def build_dict(self):
        """ Accepts a model.__dict__ as orig & returns a new dict in var d for easy serialization.
    
        """
        d = {}
        d.update((k,v) for (k,v) in self.__dict__.iteritems() if not k.startswith('_'))
        return d
    
    def big_dict(self):
        # Return big dict of item attributes to represent full item
        d = self.build_dict()
        d['uri'] = self.uri
        d['special'] = self._is_special()
        return d
    
    
    def build_errors(self, fields):
        """ Builds up errors dict.
        
        """
        print self.errors
        if self.__class__.__name__.lower() == 'practice':
            # Account editing
            objs = self.__class__.objects.all()
        else:
            # Standard API model
            objs = self.__class__.objects.all().filter(practice=self.practice)
        
        if self.pk:
            objs = objs.exclude(id=self.id)
        
        for k in fields:
            if self.__getattribute__(k) == "":
                self.errors[k] = 'Empty'
            elif self.__getattribute__(k) in [o.__getattribute__(k) for o in objs]:
                self.errors[k] = 'Duplicate'
    
    def validate(self):
        """ validate() is intended, at this point, to be usable like this via API calls:
        
            item = Item()
            item.validate()
            if item.errors:
                # item.errors is NOT an empty {} -- handle errors as you wish
                raise Invalid("There were errors!")
            else:
                item.save()
                return item
        
        As you can see, it's overriden on a per-model basis.
        
        Basically, validate() calls build_errors() to check for Empty &/or Duplicate values.
        Anything beyond that (like verifying emails, etc.), implement it in ModelName.validate()
        
        """
        
        # Simplest validator for all ApiModel instances
        # Persistence issues are showing up in re-saving items
        self.errors = {}
        self.build_errors(['name'])
            

class Version(models.Model):
    """ Version Data Types:
            1) Version for each User
            2) Version for All Users (in case we add users)
            3) Version for Notes
            4) Version for Tasks
            5) Version for Rooms
            
    """
    versionNumber = models.CharField(max_length=32)
    lastChange = models.DateTimeField()
    type = models.CharField(max_length=10)

    def __unicode__(self):
        return self.versionNumber


class Tag(ApiModel):
    """ Base class for tag objects
    
    """
    
    class Meta:
        abstract = True
    
    def save(self, force_insert=False, force_update=False):
        super(Tag, self).save(force_insert, force_update)

        for room in self.room_set.all():
            for user in room.assignedto.all():
                increment_user_version(user)


#########################################################
# NextRoom App/Service Models - public
#########################################################
@public
class Practice(models.Model):
    """ Practices are the owner of NR app data
    
    """
    practice_name = models.CharField(max_length=255, blank=False, null=False)
    app_auth_name = models.CharField(max_length=250, blank=False, null=False, unique=True)
    email = models.EmailField(blank=False, null=False)
    active = models.BooleanField(default=True, blank=True)
    
    # Empty dict for errors
    errors = {}
    
    def __unicode__(self):
        return u'%s' % self.practice_name
    
    def as_dict(self):
        # Return big dict of item attributes
        # We ensure we don't return _ attributes.
        return build_dict(self.__dict__)
    
    def validate(self):
        # See explanation of validate() on ApiModel class
        build_errors(['practice_name', 'email', 'app_auth_name'])
        # As long as email hasn't yet come back as Empty or Duplicate, check it is a valid address now
        if not self.errors.get('email'):
            if not email_re.match(self.email):
                self.errors['email'] = 'Invalid'
        


@public
class Note(Tag):
    """ Nurse-given tag for a room
    
    """
    
    def save(self, force_insert=False, force_update=False):
        super(Note, self).save(force_insert, force_update)
        increment_type_version('note')

@public
class Task(Tag):
    """ Doctor-given task for a room
    
    """
    
    def save(self, force_insert=False, force_update=False):
        super(Task, self).save(force_insert, force_update)
        increment_type_version('task')

@public
class User(ApiModel):
    """ Doctor or Nurse

    """
    ADD_CHOICES = (
        ('nurse', 'Nurse'),
        ('doctor', 'Doctor'),
        ('site', 'Site User'),
    )
    TYPE_CHOICES = (
        ('nurse', 'Nurse'),
        ('doctor', 'Doctor'),
        ('_nurse', 'All Nurses'),
        ('_doctor', 'All Doctors'),
        ('_users', 'All Users'),
        ('site', 'Site User'),
    )
    
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    # Stored as hex, converted to RGB when rendered in the xml
    color = ColorField(help_text="Click to set the color", blank=True, null=True)
    version = models.OneToOneField(Version, editable=False)
    num_accepted = models.IntegerField(default=0)
    pin = models.CharField(max_length=4, default='0000')
    is_site_user = models.BooleanField(default=False,blank=True)
    email = models.EmailField(blank=True, null=True)
    password = models.CharField(max_length=128, blank=True, null=True)
    
    def set_password(self, raw_password):
        # Taken from Django.contrib.auth.models.User.set_password()
        import random
        algo = 'sha1'
        salt = get_hexdigest(algo, str(random.random()), str(random.random()))[:5]
        hsh = get_hexdigest(algo, salt, raw_password)
        self.password = '%s$%s$%s' % (algo, salt, hsh)
    
    def check_password(self, raw_password):
        # Taken from Django.contrib.auth.models.User.check_password()
        return check_password(raw_password, self.password)
    
    def save(self, force_insert=False, force_update=False):
        increment_type_version('_users')
        try:
            version = self.version
        except Version.DoesNotExist:
            # Just create a dummy row, it's going to be changed
            version = create_dummy_version('user')
        
        version = increment_version(version)
        self.version = version
        
        # Temp to prevent overwriting password
        self.password = self.password
        
        super(User, self).save(force_insert, force_update)
    
    def small_dict(self, curr_user):
        # Returns small dict of basic item attributes
        d = {}
        d['name'] = self.name
        d['uri'] = self.uri
        # We want the API to mark the requesting user as special
        # This ensures requesting user cannot delete itself
        d['special'] = self._is_special(curr_user)
        return d
    
    def _is_special(self, curr_user=None):
        if self.type.startswith('_'):
            return True
        else:
            return self == curr_user
    
    def validate(self):
        # See explanation of validate() on ApiModel class
        fields = ['name', 'type', 'pin']
        if self.is_site_user:
            fields.append('email')
            fields.append('password')
        
        if not self.type.startswith('_'):
            # Non-system users should always have a color
            fields.append('color')
        
        # Check for Empty & Duplicate values first
        self.errors = {}
        self.build_errors(fields)
        
        if self.is_site_user and not self.errors.get('email'):
            # Validate email address via regexp
            if not email_re.match(self.email):
                self.errors['email'] = 'Invalid'
        


@public
class Room(ApiModel):
    """ Room
    
    """
    STATUS_CHOICES = (
        ('A', 'ACCEPTED'),
        ('C', 'EMPTY'),
        ('B', 'WAITING'),
    )
    
    assignedto = models.ManyToManyField(User, null=True, blank=True, verbose_name="Assigned To")
    notes = models.ManyToManyField(Note, null=True, blank=True)
    procedures = models.ManyToManyField(Task, null=True, blank=True)
    status = models.CharField(max_length=8, choices=STATUS_CHOICES, default='C')
    timestampinqueue = models.TimeField(null=True, blank=True, verbose_name="Time Put in Queue")
    lasttimeinqueue = models.TimeField(null=True, blank=True, verbose_name="Last Time Put in Queue")

    def save(self, force_insert=False, force_update=False):
        increment_type_version('room')

        # Handle timestampinqueue appropriately
        import time
        if self.pk:
            if self.status == 'B' and self.timestampinqueue == None:
                self.timestampinqueue = time.strftime('%H:%M:%S')
            elif self.status == 'C' and self.timestampinqueue is not None:
                self.lasttimeinqueue = time.strftime('%H:%M:%S')
                self.timestampinqueue = None

        super(Room, self).save(force_insert, force_update)

        for user in self.assignedto.all():
            increment_user_version(user)


    def __unicode__(self):
        return "Room %s" % self.name

#########################################################
# Signal listeners
#########################################################

def user_save_receiver(sender, **kwargs):
    """ We'll update the _users Version, but only if a new user has been created

    """
    created = kwargs['created']
    if created:
        increment_type_version('_users')

def room_save_receiver(sender, **kwargs):
    """ If this is a new room we need to manually update the Version for all Users.
    Many-to-Many relationships are not in place in the save method or the post_save signal, so we don't know who it is assigned to.
    Therefore we'll just update everyone.
    Hopefully this won't happen often.  However, there's really no way around it.  It's a known django bug.

    """
    created = kwargs['created']
    if created:
        for user in User.objects.all():
            increment_user_version(user)

def practice_save_receiver(sender, instance, created, **kwargs):
    """ Handles post-save routine for new Practice setups.
    Create a new site user with admin privileges, using the Practice email.

    """
    if created == True:
        site_admin = User(practice=instance,
                            name='%s Admin' % instance.practice_name,
                            type='site',
                            is_site_user=True,
                            email=instance.email)
        site_admin.set_password(instance.app_auth_name)
        site_admin.save()
        # Create Any Nurse
        any_nurse = User(practice=instance,
                            name='Any Nurse',
                            type='_nurse',
                            color="#ff99cc")
        any_nurse.save()
        # Create Any Doctor
        any_doc = User(practice=instance,
                            name='Any Doctor',
                            type='_doctor',
                            color="#808080")
        any_doc.save()
        # Create Any Nurse
        test_nurse = User(practice=instance,
                            name='Test Nurse',
                            type='nurse',
                            color="#ff00ff")
        test_nurse.save()
        # Create Any Doctor
        test_doc = User(practice=instance,
                            name='Test Doctor',
                            type='doctor',
                            color="#993300")
        test_doc.save()
        for i in range(1,4):
            room = Room(practice=instance, name='Room %s' % i, sort_order=i)
            room.save()
        for i in range(1,4):
            note = Note(practice=instance, name='Note %s' % i, sort_order=i)
            note.save()
        for i in range(1,4):
            proc = Task(practice=instance, name='Task %s' % i, sort_order=i)
            proc.save()


#########################################################
# Connect signals
#########################################################
post_save.connect(user_save_receiver, sender=User)
post_save.connect(room_save_receiver, sender=Room)
post_save.connect(practice_save_receiver, sender=Practice)
