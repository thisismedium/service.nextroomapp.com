from django.db import models
from django.db.models.signals import post_save

from nextroom.apps.roomqueue.customfields import ColorField

import datetime
import hashlib


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
        
            
            
    

def CreateDummyVersion(type):
    version_number = "X" * 32
    return Version.objects.create(versionNumber=version_number, lastChange=datetime.datetime.now(), type=type)


def IncrementUserVersion(user):
    """
        Increment the version row for a user
    """
    try:
        version = user.version
    except Version.DoesNotExist:
        version = CreateDummyVersion('user') # Just create a dummy row, it's going to be changed
        
    version = IncrementVersion(version)
    user.version = version
    user.save()
    
    return version


def IncrementTypeVersion(type):
    """
        Increment version based up on type
    """
    try:
        version = Version.objects.filter(type=type).order_by("-lastChange")[0]  # Should only be one, but we'll get the most recent just to be sure
    except IndexError:
        version = CreateDummyVersion(type)
        
    version = IncrementVersion(version)
    
    return version

    
        
def IncrementVersion(version):
    """
        Calculate and change the version row
    """
        
    version.lastChange = datetime.datetime.now()
    m = hashlib.md5()
    m.update(str(version.lastChange))
    version.versionNumber = m.hexdigest()
    version.save()
    
    return version
        

class Tag(models.Model):
    """
        Base class for tag objects
    """
    name = models.CharField(max_length=256, unique=True)
    
    def __unicode__(self):
        return self.name
        
    def save(self, force_insert=False, force_update=False):
        super(Tag, self).save(force_insert, force_update)
        
        for room in self.room_set.all():
            for user in room.assignedto.all():
                IncrementUserVersion(user)

    

class Note(Tag):
    """
        Nurse-given tag for a room
    """
    pass
    
    def save(self, force_insert=False, force_update=False):
        super(Note, self).save(force_insert, force_update)
        IncrementTypeVersion('note')
    

class Procedure(Tag):
    """
        Doctor-given tag for a room
    """
    pass
    
    def save(self, force_insert=False, force_update=False):
        super(Procedure, self).save(force_insert, force_update)
        IncrementTypeVersion('procedure')
    
    
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
    )
    
    name = models.CharField(max_length=256)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    color = ColorField(help_text="Click to set the color") #    Stored as hex, converted to RGB when rendered in the xml
    version = models.OneToOneField(Version, editable=False)
    status = models.CharField(max_length=32, null=True, blank=True, editable=False) #   This is only here for future purposes, we'll just hide it for now
    
    def save(self, force_insert=False, force_update=False):
        IncrementTypeVersion('allusers')
        try:
            version = self.version
        except Version.DoesNotExist:
            version = CreateDummyVersion('user') # Just create a dummy row, it's going to be changed

        version = IncrementVersion(version)
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
        IncrementTypeVersion('allusers')

post_save.connect(user_save_receiver, sender=User)   

        


class Room(models.Model):
    """
        Room
    """
    STATUS_CHOICES = (
        ('ACCEPTED', 'ACCEPTED'),
        ('EMPTY', 'EMPTY'),
        ('WAITING', 'WAITING'),
    )
    
    assignedto = models.ManyToManyField(User, null=True, blank=True, verbose_name="Assigned To")
    notes = models.ManyToManyField(Note, null=True, blank=True)
    procedures = models.ManyToManyField(Procedure, null=True, blank=True)
    status = models.CharField(max_length=8, choices=STATUS_CHOICES, default='EMPTY')
    roomnumber = models.CharField(max_length=64, unique=True, verbose_name="Room Number")
    timestampinqueue = models.TimeField(null=True, blank=True, verbose_name="Time Put in Queue")
    
    def save(self, force_insert=False, force_update=False):
        IncrementTypeVersion('room')
        
        super(Room, self).save(force_insert, force_update)
        
        for user in self.assignedto.all():
            IncrementUserVersion(user)

        
    def __unicode__(self):
        return "Room #%d" % self.roomnumber
        
        
        
def room_save_receiver(sender, **kwargs):
    created = kwargs['created']
    
    #   If this is a new room we need to manually update the Version for all Users
    #   Many-to-Many relationships are not in place in the save method or the post_save signal, so we don't know who it is assigned to
    #   Therefore we'll just update everyone
    #   Hopefully this won't happen often.  However, there's really no way around it.  It's a known django bug
    
    if created:
        for user in User.objects.all():
            IncrementUserVersion(user)
    

post_save.connect(room_save_receiver, sender=Room)   

    