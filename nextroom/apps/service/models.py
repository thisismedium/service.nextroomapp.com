#########################################################
# Imports
#########################################################

from django.contrib.auth.models import get_hexdigest, check_password
from django.db import models
from django.db.models.signals import post_save
from django.utils.hashcompat import md5_constructor, sha_constructor

from nextroom.apps.service.customfields import ColorField

import datetime
import hashlib


#########################################################
# Helper methods
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
    """
        Increment the version row for a user
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
    
PUBLIC = {}

def public(cls):
    PUBLIC[cls.__name__.lower()] = cls
    return cls    

#########################################################
# Base & Helper Models -- private
#########################################################

class Version(models.Model):
    """
        Version Data Types:
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


class Tag(models.Model):
    """
        Base class for tag objects
    """
    practice = models.ForeignKey('Practice', blank=False, null=False)
    name = models.CharField(max_length=256)
    sort_order = models.IntegerField(default=0, blank=True)

    def __unicode__(self):
        return self.name
    
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
    """
        Practices are the owner of NR app data
    """
    practice_name = models.CharField(max_length=255, blank=False, null=False)
    app_auth_name = models.CharField(max_length=250, blank=False, null=False, unique=True)
    email = models.EmailField(blank=False, null=False)
    active = models.BooleanField(default=True, blank=True)

    def __unicode__(self):
        return u'%s' % self.practice_name

@public
class Note(Tag):
    """
        Nurse-given tag for a room
    """
    pass

    def save(self, force_insert=False, force_update=False):
        super(Note, self).save(force_insert, force_update)
        increment_type_version('note')

@public
class Task(Tag):
    """
        Doctor-given tag for a room
    """
    pass

    def save(self, force_insert=False, force_update=False):
        super(Task, self).save(force_insert, force_update)
        increment_type_version('task')

@public
class User(models.Model):
    """
        Doctor or Nurse

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
    practice = models.ForeignKey(Practice, blank=False, null=False)
    name = models.CharField(max_length=256)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    # Stored as hex, converted to RGB when rendered in the xml
    color = ColorField(help_text="Click to set the color", blank=True, null=True)
    version = models.OneToOneField(Version, editable=False)
    num_accepted = models.IntegerField(default=0)
    pin = models.CharField(max_length=4, default='0000')
    is_site_user = models.BooleanField(default=False,blank=True)
    is_admin = models.BooleanField(default=False,blank=True)
    email = models.EmailField(blank=True, null=True)
    password = models.CharField(max_length=128, blank=True, null=True)
    sort_order = models.IntegerField(default=0, blank=True)

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
        super(User, self).save(force_insert, force_update)


    def __unicode__(self):
        return self.name

@public
class Room(models.Model):
    """
        Room
    """
    STATUS_CHOICES = (
        ('A', 'ACCEPTED'),
        ('C', 'EMPTY'),
        ('B', 'WAITING'),
    )
    practice = models.ForeignKey(Practice, blank=False, null=False)
    assignedto = models.ManyToManyField(User, null=True, blank=True, verbose_name="Assigned To")
    notes = models.ManyToManyField(Note, null=True, blank=True)
    procedures = models.ManyToManyField(Task, null=True, blank=True)
    status = models.CharField(max_length=8, choices=STATUS_CHOICES, default='C')
    name = models.CharField(max_length=64, verbose_name="Room Number")
    timestampinqueue = models.TimeField(null=True, blank=True, verbose_name="Time Put in Queue")
    lasttimeinqueue = models.TimeField(null=True, blank=True, verbose_name="Last Time Put in Queue")
    sort_order = models.IntegerField(default=0, blank=True)

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
                            is_admin=True,
                            email=instance.email)
        site_admin.set_password(instance.app_auth_name)
        site_admin.save()
        # Create Any Nurse
        any_nurse = User(practice=instance,
                            name='Any Nurse',
                            type='_nurse',
                            is_site_user=False,
                            is_admin=False,
                            color="#ff99cc")
        any_nurse.save()
        # Create Any Doctor
        any_doc = User(practice=instance,
                            name='Any Doctor',
                            type='_doctor',
                            is_site_user=False,
                            is_admin=False,
                            color="#808080")
        any_doc.save()
        # Create Any Nurse
        test_nurse = User(practice=instance,
                            name='Test Nurse',
                            type='nurse',
                            is_site_user=False,
                            is_admin=False,
                            color="#ff00ff")
        test_nurse.save()
        # Create Any Doctor
        test_doc = User(practice=instance,
                            name='Test Doctor',
                            type='doctor',
                            is_site_user=False,
                            is_admin=False,
                            color="#993300")
        test_doc.save()
        for i in range(1,4):
            room = Room(practice=instance, name='%s' % i, sort_order=i)
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
