# Python imports
import json

# Django imports
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import RequestContext
from django import forms

# NextRoom imports
from nextroom.apps.service.decorators import (app_auth)
from nextroom.apps.service.screendisplay import *
from nextroom.apps.service.models import *

# CONSTANTS
USER_KEY = 'user'


################################
#   Helper methods
################################

def throw_xml_error():
    return render_to_response('service/app/base.xml', {'results': None, 'version': '', 'status': 'error', 'notify': 'No'}, mimetype="text/xml")



def convertColors(user):
    from nextroom.utils.webcolors import hex_to_rgb
    user.colorr, user.colorg, user.colorb = hex_to_rgb(user.color) if user.color is not None or user.color != '' else ''
    return user



################################
#   iPhone views
################################

def app_login(request):
    # Authenticate app user
    if request.method == 'POST':
        uid = request.POST.get('user', None)
        pin = request.POST.get('pin', None)
        account_name = request.POST.get('account_name', None)
        if uid and pin and account_name:
            try:
                user = User.objects.get(pk=int(uid), pin=pin, practice__app_auth_name=account_name)
            except User.DoesNotExist:
                return HttpResponse("FALSE")
            else:
                request.session[USER_KEY] = user
                return HttpResponse("TRUE")
    else:
        return HttpResponse("FALSE")



def verify_account_exists(request, practice):
    try:
        practice = Practice.objects.get(app_auth_name=practice)
    except Practice.DoesNotExist:
        return HttpResponse("FALSE")
    else:
        return HttpResponse("TRUE")



def pin_check(request):
    if request.method == 'GET':
        # First ensure we have a valid User making this request
        userid = request.GET.get('user')
        pin = request.GET.get('pin')
        try:
            user = User.objects.get(pk=userid, pin=pin)
        except User.DoesNotExist:
            return HttpResponse("FALSE")
        else:
            return HttpResponse("TRUE")
    else:
        return HttpResponse("FALSE")



@app_auth
def get_rooms(request):
    if request.method == 'GET':
        # versionNumber is a concatenation of versionNumber for Rooms and versionNumber for this User
        versionNumber = request.GET.get('version')
        user = request.session.get(USER_KEY)
        status = 'current'
        rooms = None
        notify = 'NO'

        if not versionNumber or versionNumber == "none":
            rooms = Room.objects.filter(practice=user.practice).distinct().order_by('sort_order', 'status', 'timestampinqueue', 'lasttimeinqueue', 'name')
            status = 'update'
            notify = 'YES'

            rooms_version = increment_type_version('room')

            try:
                user_version = user.version
            except Version.DoesNotExist:
                user_version = increment_user_version(user)
        else:

            roomsVersionNumber = versionNumber[0:32]
            userVersionNumber = versionNumber[32:64]
            #   Check to see if this user already has a version, otherwise it's the first time and we'll create a version for them
            try:
                user_version = user.version
            except Version.DoesNotExist:
                user_version = increment_user_version(user)

            #   Figure out what version was passed in
            try:
                rooms_version = Version.objects.get(versionNumber=roomsVersionNumber)
            except Version.DoesNotExist:
                #   There is no reason that this shouldn't exist, unless we've never given the user a version, so give them the current version
                try:
                    rooms_version = Version.objects.filter(type='room').order_by("-lastChange")[0]
                except Version.DoesNotExist:
                    #   So, maybe we never created a version for rooms, create it now
                    rooms_version = increment_type_version('room')

            #   Now, see if that version is the current version for rooms
            if roomsVersionNumber != rooms_version.versionNumber:
                rooms = Room.objects.all().filter(practice=user.practice).order_by('sort_order', 'status','timestampinqueue', 'lasttimeinqueue', 'name')
                status = 'update'

            #   Now see if the version for the user is different, if so we'll notify
            if userVersionNumber != user_version.versionNumber:
                notify = 'YES'

        return render_to_response('service/app/rooms.xml', {'results': rooms, 'version': "%s%s" % (rooms_version.versionNumber, user_version.versionNumber), 'status': status, 'notify': notify}, mimetype="text/xml")



@app_auth
def get_room(request):
    if request.method == 'GET':

        room_id = request.GET.get("room")
        room = Room.objects.get(pk=room_id)

        return render_to_response('service/app/room.xml', {'room': room}, mimetype="text/xml")



@app_auth
def get_tags(request, type):
    if request.method == 'GET':
        # First ensure we have a valid User making this request

        user = request.session.get(USER_KEY)
        version = request.GET.get('version')
        status = 'current'
        tags = None
        notify = 'NO'

        #   Get the current version for notes
        try:
            current_version = Version.objects.get(type=type)
        except Version.DoesNotExist:
            current_version = increment_type_version(type)
            status = 'update'

        #   Compare the current version with the version that was passed
        if version != current_version.versionNumber:
            if type == 'note':
                tags = Note.objects.all().filter(practice=user.practice).order_by('sort_order')
            elif type == 'task':
                tags = Task.objects.all().filter(practice=user.practice).order_by('sort_order')
            status = 'update'
            notify = 'YES'

        return render_to_response('service/app/tags.xml', {'results': tags, 'version': current_version.versionNumber, 'status': status, 'notify': notify}, mimetype="text/xml")




def get_users(request, practice):
    if request.method == 'GET':
        try:
            practice = Practice.objects.get(app_auth_name=practice)
        except Practice.DoesNotExist:
            return throw_xml_error()
        else:
            version = request.GET.get('version')
            status = 'current'
            users = []
            notify = 'NO'

            #   Get the current version for _users
            try:
                current_version = Version.objects.get(type='_users')
            except Version.DoesNotExist:
                current_version = increment_type_version('_users')
                status = 'update'

            #   Compare the current version with the version that was passed
            if version != current_version.versionNumber:
                users = User.objects.all().filter(practice=practice).exclude(type='site').order_by('sort_order', 'name','type')
                status = 'update'

            users = map(convertColors, users)

            return render_to_response('service/app/users.xml', {'results': users, 'version': current_version.versionNumber, 'status': status, 'notify': notify}, mimetype="text/xml")



@app_auth
def update_room(request):
    if request.method == 'POST':
        print "update"
        user = request.session.get(USER_KEY)
        print user
        room_xml = request.POST.get('room')
        print room_xml
        from xml.dom import minidom
        xmldoc = minidom.parseString(room_xml)

        roomnode = xmldoc.firstChild
        print roomnode

        assignedto_names = roomnode.getAttribute("assignedto").split(',')
        print assignedto_names
        notes_names = roomnode.getAttribute("notes").split(',')
        print notes_names
        tasks_names = roomnode.getAttribute("tasks").split(',')
        print tasks_names
        room_id = roomnode.getAttribute("roomUID")
        print room_id
        roomnumber = roomnode.getAttribute("roomnumber") #  We'll just use this as a sanity check
        print roomnumber
        status = roomnode.getAttribute("status")
        print status
        timestampinqueue = roomnode.getAttribute("timestampinqueue")
        print timestampinqueue

        room = Room.objects.get(pk=room_id)
        print room
        if room.name != roomnumber:
            print "name & number don't match!! FUCK"
            #   A dumb sanity check
            return throw_xml_error()



        #   Clear the assignedto users from the room, we're reloading
        room.assignedto.clear()
        print "cleared assignedto"
        for name in assignedto_names:
            print "Name: %s" % name
            if name:
                try:
                    assignee = User.objects.get(name=name, practice=user.practice)
                    print assignee
                except User.DoesNotExist:
                    #   One of the assigned to users is unknown, throw an error
                    print "NO USER"
                    return throw_xml_error()

                room.assignedto.add(assignee)
                print "added assignee"
                if assignee.type == '_doctor':
                    print "update all doctors"
                    for u in User.objects.all().filter(type='doctor').filter(practice=user.practice):
                        u.save()
                elif assignee.type == '_nurse':
                    print "update all nurses"
                    for u in User.objects.all().filter(type='nurse').filter(practice=user.practice):
                        u.save()

        #   Clear the notes from the room, we're reloading
        room.notes.clear()
        print "cleared notes"
        for name in notes_names:
            print "Note: %s" % name
            if name:
                try:
                    note = Note.objects.get(name=name, practice=user.practice)
                    print note
                except Note.DoesNotExist:
                    print "NO NOTE"
                    return throw_xml_error()

                room.notes.add(note)
                print "added note"
        #   Clear the tasks from the room, we're reloading
        room.tasks.clear()
        print "cleared tasks"
        for name in tasks_names:
            print "Task: %s" % name
            if name:
                try:
                    task = Task.objects.get(name=name, practice=user.practice)
                    print task
                except Task.DoesNotExist:
                    print "NO TASK"
                    return throw_xml_error()

                room.tasks.add(task)
                print "added task"

        if room.status != status and status == 'A':
            print "increase user's num_accepted"
            user.num_accepted += 1
            user.save()

        room.status = status
        room.save()
        print "saved ROOM"
        rooms = Room.objects.filter(practice=user.practice).order_by('status','timestampinqueue', 'lasttimeinqueue', 'sort_order')
        rooms_version = Version.objects.filter(type='room').order_by("-lastChange")[0]

        return render_to_response('service/app/rooms.xml', {'results': rooms, 'version': "%s%s" % (rooms_version.versionNumber, user.version.versionNumber), 'status': 'update', 'notify': 'YES'}, mimetype="text/xml")



