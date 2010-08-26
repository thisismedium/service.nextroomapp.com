from django.contrib.auth.models import get_hexdigest, check_password
from django.db import models
from django.db.models.signals import post_save
from django.utils.hashcompat import md5_constructor, sha_constructor

from apps.service.customfields import ColorField
from apps.service.utils import *

import datetime
import hashlib

class Practice(models.Model):
    """
        Practices are the owner of NR app data
    """
    account_name = models.CharField(max_length=250, blank=False, null=False)
    practice_name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=False, null=False)
    active = models.BooleanField(default=True, blank=True)
    
    @property
    def full_name(self):
        return self.user.get_full_name()
    
    def __unicode__(self):
        return u'%s' % self.practice_name

class Version(models.Model):
    """
        Version Data Types:
            1) Version for each User 
            2) Version for All Users (in case we add users)
            3) Version for Notes
            4) Version for Specifications
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
    practice = models.ForeignKey(Practice, blank=False, null=False)
    name = models.CharField(max_length=256, unique=True)
    sort_order = models.IntegerField(default=0, blank=True)
    
    def __unicode__(self):
        return self.name
        
    def save(self, force_insert=False, force_update=False):
        super(Tag, self).save(force_insert, force_update)
        
        for room in self.room_set.all():
            for user in room.assignedto.all():
                increment_user_version(user)

    

class Note(Tag):
    """
        Nurse-given tag for a room
    """
    pass
    
    def save(self, force_insert=False, force_update=False):
        super(Note, self).save(force_insert, force_update)
        increment_type_version('note')
    

class Procedure(Tag):
    """
        Doctor-given tag for a room
    """
    pass
    
    def save(self, force_insert=False, force_update=False):
        super(Procedure, self).save(force_insert, force_update)
        increment_type_version('procedure')
    
    
class User(models.Model):
    """
        Doctor or Nurse
        
    """
    TYPE_CHOICES = (
        ('nurse', 'Nurse'),
        ('doctor', 'Doctor'),
        ('allnurses', 'All Nurses'),
        ('alldoctors', 'All Doctors'),
        ('allusers', 'All Users'),
        ('site', 'Site User'),
    )
    practice = models.ForeignKey(Practice, blank=False, null=False)
    name = models.CharField(max_length=256)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    # Stored as hex, converted to RGB when rendered in the xml
    color = ColorField(help_text="Click to set the color")
    version = models.OneToOneField(Version, editable=False)
    num_accepted = models.IntegerField(default=0)
    pin = models.CharField(max_length=4, default='0000')
    is_site_user = models.BooleanField(default=False,blank=True)
    is_admin = models.BooleanField(default=False,blank=True)
    email = models.EmailField(blank=True, null=True)
    password = models.CharField(max_length=128)
    
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
        increment_type_version('allusers')
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
        
        
def user_save_receiver(sender, **kwargs):
    """
        We'll update the allusers Version, but only if a new user has been created
    """
    created = kwargs['created']
    
    if created:
        increment_type_version('allusers')

post_save.connect(user_save_receiver, sender=User)   

        


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
    procedures = models.ManyToManyField(Procedure, null=True, blank=True)
    status = models.CharField(max_length=8, choices=STATUS_CHOICES, default='C')
    roomnumber = models.CharField(max_length=64, unique=True, verbose_name="Room Number")
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
        return "Room %s" % self.roomnumber
        
        
        
def room_save_receiver(sender, **kwargs):
    created = kwargs['created']
    
    #   If this is a new room we need to manually update the Version for all Users
    #   Many-to-Many relationships are not in place in the save method or the post_save signal, so we don't know who it is assigned to
    #   Therefore we'll just update everyone
    #   Hopefully this won't happen often.  However, there's really no way around it.  It's a known django bug
    
    if created:
        for user in User.objects.all():
            increment_user_version(user)
    

post_save.connect(room_save_receiver, sender=Room)   

    