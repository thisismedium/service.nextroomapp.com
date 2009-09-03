from django.http import HttpResponse
from django.shortcuts import render_to_response

from nextroom.apps.roomqueue.models import *

def get_rooms(request):
    if request.method == 'GET':
        versionNumber = request.GET.get('version') #    versionNumber is a concatenation of versionNumber for Rooms and versionNumber for this User
        roomsVersionNumber = versionNumber[0:32]
        userVersionNumber = versionNumber[32:64]
        userid = request.GET.get('user')
        
        status = 'current'
        rooms = None
        notify = 'NO'
        
        try:
            user = User.objects.get(pk=userid)
        except User.DoesNotExist:
            #   If we don't recognize this username we'll send back an error
            return render_to_response('nextroom/rooms.xml', {'results': rooms, 'version': '', 'status': 'error', 'notify': notify}, mimetype="text/xml")
            
        #   Check to see if this user already has a version, otherwise it's the first time and we'll create a version for them       
        try:
            user_version = user.version
        except Version.DoesNotExist:
            user_version = IncrementUserVersion(user)

        #   Figure out what version was passed in
        try:
            rooms_version = Version.objects.get(versionNumber=roomsVersionNumber)
        except Version.DoesNotExist:
            #   There is no reason that this shouldn't exist, unless we've never given the user a version, so give them the current version
            try:
                rooms_version = Version.objects.get(type='room')
            except Version.DoesNotExist:
                #   So, maybe we never created a version for rooms, create it now
                rooms_version = CreateDummyVersion('room')
                rooms_version = IncrementVersion(rooms_version)

        #   Now, see if that version is the current version for rooms
        if roomsVersionNumber != rooms_version.versionNumber:
            rooms = Room.objects.filter(assignedto__isnull=False)
            status = 'update'


        #   Now see if the version for the user is different, if so we'll notify
        if userVersionNumber != user_version.versionNumber:
            notify = 'YES'        

#        return HttpResponse("roomsVersionNumber: %s<br>userVersionNumber: %s<br>rooms_version: %s<br>user_version: %s<br>" % (roomsVersionNumber, userVersionNumber, rooms_version.versionNumber, user_version.versionNumber))    
        return render_to_response('nextroom/rooms.xml', {'results': rooms, 'version': "%s%s" % (rooms_version.versionNumber, user_version.versionNumber), 'status': status, 'notify': notify}, mimetype="text/xml")
        
        
def get_tags(request, type):
    if request.method == 'GET':
        version = request.GET.get('version')
        username = request.GET.get('user')
        
        status = 'current'
        tags = None
        notify = 'NO'
        
        #   Get the current version for notes
        try:
            current_version = Version.objects.get(type=type)
        except Version.DoesNotExist:
            current_version = CreateDummyVersion(type)
            current_version = IncrementVersion(current_version)
            
        
        #   Compare the current version with the version that was passed
        if version != current_version.versionNumber:
            if type == 'note':
                tags = Note.objects.all()
            elif type == 'procedure':
                tags = Procedure.objects.all()
            status = 'update'
            
        return render_to_response('nextroom/tags.xml', {'results': tags, 'version': current_version.versionNumber, 'status': status, 'notify': notify}, mimetype="text/xml")
        

def convertColors(user):
    from nextroom.utils.webcolors import hex_to_rgb
    
    user.colorr, user.colorg, user.colorb = hex_to_rgb(user.color)
    return user
        
def get_users(request):
    if request.method == 'GET':
        version = request.GET.get('version')
        username = request.GET.get('user')
        
        status = 'current'
        users = None
        notify = 'NO'
        
        #   Get the current version for notes
        try:
            current_version = Version.objects.get(type='allusers')
        except Version.DoesNotExist:
            current_version = CreateDummyVersion(type)
            current_version = IncrementVersion(current_version)
            
        
        #   Compare the current version with the version that was passed
        if version != current_version.versionNumber:
            users = User.objects.all()
            
        users = map(convertColors, users)
        
        return render_to_response('nextroom/users.xml', {'results': users, 'version': current_version.versionNumber, 'status': status, 'notify': notify}, mimetype="text/xml")  
        