from django.http import HttpResponse
from django.shortcuts import render_to_response

from nextroom.apps.roomqueue.models import *

def throw_xml_error():
    return render_to_response('nextroom/base.xml', {'results': None, 'version': '', 'status': 'error', 'notify': 'No'}, mimetype="text/xml")

def get_rooms(request):
    if request.method == 'GET':
        versionNumber = request.GET.get('version') #    versionNumber is a concatenation of versionNumber for Rooms and versionNumber for this User
        userid = request.GET.get('user')
        
        status = 'current'
        rooms = None
        notify = 'NO'
                        
        if not versionNumber or versionNumber == "none":
            rooms = Room.objects.all().distinct()
            status = 'update'
            notify = 'YES'
            
            rooms_version = IncrementTypeVersion('room')
            
            try:
                userid = int(userid)
                try:
                    user = User.objects.get(pk=userid)
                except User.DoesNotExist:
                    #   If we don't recognize this username we'll send back an error
                    return throw_xml_error()
            
                try:
                    user_version = user.version
                except Version.DoesNotExist:
                    user_version = IncrementUserVersion(user)
            except ValueError:
                #user_version = CreateDummyVersion('user')
                user_version = { "versionNumber": ("X" * 32) }
        else:
        
            roomsVersionNumber = versionNumber[0:32]
            userVersionNumber = versionNumber[32:64]
            
            try:
                userid = int(userid)            
                try:
                    user = User.objects.get(pk=userid)
                except User.DoesNotExist:
                    #   If we don't recognize this username we'll send back an error
                    return throw_xml_error()
                
                #   Check to see if this user already has a version, otherwise it's the first time and we'll create a version for them       
                try:
                    user_version = user.version
                except Version.DoesNotExist:
                    user_version = IncrementUserVersion(user)
            except ValueError:
                #user_version = CreateDummyVersion('user')
                user_version = { "versionNumber": ("X" * 32) }
    
            #   Figure out what version was passed in
            try:
                rooms_version = Version.objects.get(versionNumber=roomsVersionNumber)
            except Version.DoesNotExist:
                #   There is no reason that this shouldn't exist, unless we've never given the user a version, so give them the current version
                try:
                    rooms_version = Version.objects.filter(type='room').order_by("-lastChange")[0]
                except Version.DoesNotExist:
                    #   So, maybe we never created a version for rooms, create it now
                    rooms_version = IncrementTypeVersion('room')
    
            #   Now, see if that version is the current version for rooms
            if roomsVersionNumber != rooms_version.versionNumber:
                #rooms = Room.objects.filter(assignedto__isnull=False).distinct()
                rooms = Room.objects.order_by('roomnumber')
                status = 'update'
    
    
            #   Now see if the version for the user is different, if so we'll notify
            if userVersionNumber != user_version.versionNumber:
                notify = 'YES'        

        return render_to_response('nextroom/rooms.xml', {'results': rooms, 'version': "%s%s" % (rooms_version.versionNumber, user_version.versionNumber), 'status': status, 'notify': notify}, mimetype="text/xml")
        
        
def get_tags(request, type):
    if request.method == 'GET':
        version = request.GET.get('version')
        
        status = 'current'
        tags = None
        notify = 'NO'
        
        #   Get the current version for notes
        try:
            current_version = Version.objects.get(type=type)
        except Version.DoesNotExist:
            current_version = IncrementTypeVersion(type)
            status = 'update'
            
        
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
        
        status = 'current'
        users = []
        notify = 'NO'
        
        #   Get the current version for allusers
        try:
            current_version = Version.objects.get(type='allusers')
        except Version.DoesNotExist:
            current_version = IncrementTypeVersion('allusers')
            status = 'update'
            
        
        #   Compare the current version with the version that was passed
        if version != current_version.versionNumber:
            users = User.objects.all()
            status = 'update'
            
        users = map(convertColors, users)
        
        return render_to_response('nextroom/users.xml', {'results': users, 'version': current_version.versionNumber, 'status': status, 'notify': notify}, mimetype="text/xml")  

#def post_test(request):
#    return render_to_response('nextroom/post_test.html')
        
        
def update_room(request):
    if request.method == 'POST':
        userid = request.GET.get('user')
        room_xml = request.POST.get('room')
        

        try:
            user = User.objects.get(pk=userid)
        except User.DoesNotExist:
            #   If we don't recognize this username we'll send back an error
           return throw_xml_error()
        
        from xml.dom import minidom
        xmldoc = minidom.parseString(room_xml)
        
        roomnode = xmldoc.firstChild
        
        assignedto_names = roomnode.getAttribute("assignedto").split(',')
        notes_names = roomnode.getAttribute("notes").split(',')
        procedures_names = roomnode.getAttribute("procedures").split(',')
        room_id = roomnode.getAttribute("roomUID")
        roomnumber = roomnode.getAttribute("roomnumber") #  We'll just use this as a sanity check
        status = roomnode.getAttribute("status")
        timestampinqueue = roomnode.getAttribute("timestampinqueue")
        
        room = Room.objects.get(pk=room_id)
        
        if room.roomnumber != int(roomnumber):
            #   A dumb sanity check
            return throw_xml_error()

        

        #   Clear the assignedto users from the room, we're reloading
        room.assignedto.clear()            
        for name in assignedto_names:
            try:
                assignee = User.objects.get(name=name)
            except User.DoesNotExist:
                #   One of the assigned to users is unknown, throw and error
                return throw_xml_error()
        
            room.assignedto.add(assignee)
       
        #   Clear the notes from the room, we're reloading
        room.notes.clear()
        for name in notes_names:
            try:
                note = Note.objects.get(name=name)
            except Note.DoesNotExist:
                return throw_xml_error()
                
            room.notes.add(note)
            
        #   Clear the procedures from the room, we're reloading
        room.procedures.clear()
        for name in procedures_names:
            try:
                procedure = Procedure.objects.get(name=name)
            except Procedure.DoesNotExist:
                return throw_xml_error()
                
            room.procedures.add(procedure)

        room.status = status
        room.save()
        
        #rooms = Room.objects.filter(assignedto__isnull=False).distinct()
        rooms = Room.objects.order_by('roomnumber')
        rooms_version = Version.objects.filter(type='room').order_by("-lastChange")[0]
        
        return render_to_response('nextroom/rooms.xml', {'results': rooms, 'version': "%s%s" % (rooms_version.versionNumber, user.version.versionNumber), 'status': 'update', 'notify': 'YES'}, mimetype="text/xml")
        