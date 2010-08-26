import datetime
import hashlib
from models import *

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

    
        
