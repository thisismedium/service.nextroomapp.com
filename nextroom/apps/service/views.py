import functools
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import RequestContext
from django import forms
from nextroom.apps.service.screendisplay import *
from nextroom.apps.service.models import *
try:
    import simplejson as json
except ImportError:
    import json

USER_KEY = 'app_user'

################################
#   NextRoom decorators
################################

def app_auth(view):
    # Verify app user is authenticated & valid
    @functools.wraps(view)
    def internal(request, *args, **kwargs):
        if request.session.get(USER_KEY, None) is not None:
            return view(request, *args, **kwargs)
        else:
            return throw_xml_error()
    return internal

def login_required(view):
    # Verify admin user is authenticated & valid
    @functools.wraps(view)
    def internal(request, *args, **kwargs):
        u = request.session.get(USER_KEY, None)
        if u is not None and isinstance(u, User):
            return view(request, *args, **kwargs)
        else:
            print "no request.user? %s" % request.user
            return login(request)
    return internal

################################
#   NextRoom iPhone URLs
################################

def throw_xml_error():
    return render_to_response('service/app/base.xml', {'results': None, 'version': '', 'status': 'error', 'notify': 'No'}, mimetype="text/xml")

def app_login(request):
    # Authenticate app user
    if request.method == 'POST':
        uid = request.POST.get('user', None)
        pin = request.POST.get('pin', None)
        account_name = request.POST.get('account_name', None)
        if uid and pin and account_name:
            try:
                user = User.objects.get(pk=int(uid), pin=pin, practice__account_name=account_name)
            except User.DoesNotExist:
                return HttpResponse("FALSE")
            else:
                request.session[USER_KEY] = user
                return HttpResponse("TRUE")
    else:
        return HttpResponse("FALSE")

def verify_account_exists(request, practice):
    try:
        practice = Practice.objects.get(account_name=practice)
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
            rooms = Room.objects.all().distinct().order_by('status', 'timestampinqueue', 'lasttimeinqueue', 'roomnumber')
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
                rooms = Room.objects.all().filter(practice=user.practice).order_by('status','timestampinqueue', 'lasttimeinqueue', 'roomnumber')
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
            elif type == 'procedure':
                tags = Task.objects.all().filter(practice=user.practice).order_by('sort_order')
            status = 'update'
            notify = 'YES'

        return render_to_response('service/app/tags.xml', {'results': tags, 'version': current_version.versionNumber, 'status': status, 'notify': notify}, mimetype="text/xml")


def convertColors(user):
    from nextroom.utils.webcolors import hex_to_rgb

    user.colorr, user.colorg, user.colorb = hex_to_rgb(user.color)
    return user

def get_users(request, practice):
    if request.method == 'GET':
        try:
            practice = Practice.objects.get(account_name=practice)
        except Practice.DoesNotExist:
            return throw_xml_error()
        else:
            version = request.GET.get('version')
            status = 'current'
            users = []
            notify = 'NO'

            #   Get the current version for allusers
            try:
                current_version = Version.objects.get(type='allusers')
            except Version.DoesNotExist:
                current_version = increment_type_version('allusers')
                status = 'update'


            #   Compare the current version with the version that was passed
            if version != current_version.versionNumber:
                users = User.objects.all().filter(practice=practice).exclude(type='site').order_by('name','type')
                status = 'update'

            users = map(convertColors, users)

            return render_to_response('service/app/users.xml', {'results': users, 'version': current_version.versionNumber, 'status': status, 'notify': notify}, mimetype="text/xml")

@app_auth
def update_room(request):
    if request.method == 'POST':
        user = request.session.get(USER_KEY)
        room_xml = request.POST.get('room')
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
        if room.roomnumber != roomnumber:
            #   A dumb sanity check
            return throw_xml_error()



        #   Clear the assignedto users from the room, we're reloading
        room.assignedto.clear()
        for name in assignedto_names:
            if name:
                try:
                    assignee = User.objects.get(name=name, practice=user.practice)
                except User.DoesNotExist:
                    #   One of the assigned to users is unknown, throw an error
                    return throw_xml_error()

                room.assignedto.add(assignee)

                if assignee.type == 'alldoctors':
                    for u in User.objects.all().filter(type='doctor').filter(practice=user.practice):
                        u.save()
                elif assignee.type == 'allnurses':
                    for u in User.objects.all().filter(type='nurse').filter(practice=user.practice):
                        u.save()

        #   Clear the notes from the room, we're reloading
        room.notes.clear()
        for name in notes_names:
            if name:
                try:
                    note = Note.objects.get(name=name, practice=user.practice)
                except Note.DoesNotExist:
                    return throw_xml_error()

                room.notes.add(note)

        #   Clear the procedures from the room, we're reloading
        room.procedures.clear()
        for name in procedures_names:
            if name:
                try:
                    procedure = Task.objects.get(name=name, practice=user.practice)
                except Task.DoesNotExist:
                    return throw_xml_error()

                room.procedures.add(procedure)

        if room.status != status and status == 'A':
            user.num_accepted += 1
            user.save()

        room.status = status
        room.save()
        rooms = Room.objects.filter(practice=user.practice).order_by('status','timestampinqueue', 'lasttimeinqueue', 'sort_order')
        rooms_version = Version.objects.filter(type='room').order_by("-lastChange")[0]

        return render_to_response('service/app/rooms.xml', {'results': rooms, 'version': "%s%s" % (rooms_version.versionNumber, user.version.versionNumber), 'status': 'update', 'notify': 'YES'}, mimetype="text/xml")



#######################################
#   NextRoom web helpers
#######################################

def get_model(model):
    # Return model based on URL arg
    return PUBLIC.get(model)

def get_items(model, practice):
    # Return all objects for given model & practice
    try:
        return model.objects.filter(practice=practice).order_by('sort_order', 'name')
    except AttributeError:
        return []

def get_item(model, practice, id):
    # Return object for given model, practice, & id
    try:
        return model.objects.get(id=id)
    except model.DoesNotExist:
        return None

def post_item(model, practice, data):
    # Create a new object for given model & practice
    pass

def put_items(model, practice, data):
    # Re-sort all objects for given model & practice
    pass

def put_item(model, practice, id, data):
    # Update given object for model, practice, & id with data
    pass

def delete_item(model, practice, id):
    # Delete object for model & practice
    pass

#######################################
#   NextRoom web URLs
#######################################

def authenticate(email=None, password=None):
    users = User.objects.filter(email=email)
    user = None
    for u in users:
        if u.check_password(password):
            user = u
            break
    else:
        u = None
    return u

def login(request):
    # Authenticate admin user
    valid, user = True, None
    if request.method == 'POST':
        # Process form
        email = request.POST.get('email', None)
        password = request.POST.get('password', None)
        user = authenticate(email,password)
        if user is not None and isinstance(user, User):
            request.session[USER_KEY] = user
            return HttpResponseRedirect('/#app')
        else:
            request.session[USER_KEY] = None
            valid = False

    return render_to_response('service/admin/login.html',
        {'user':user,
        'valid':valid}
        )

def logout(request):
    request.session[USER_KEY] = None
    return HttpResponseRedirect('/')

@login_required
def admin(request):
    # Show user admin landing page.
    user = request.session.get(USER_KEY, None)
    return render_to_response('service/admin/base.html', {
        'user': user,
        'user_types': User.TYPE_CHOICES,
        'media': '%sservice/' % settings.MEDIA_URL
    })

@login_required
def app_model(request, model):
    # GET: Return list of items for given model
    # POST: Create a new object for given model
    # PUT: Update sort_order for given model

    # if request.META['CONTENT_TYPE'] == 'application/json':
    #         pass
    #     else:
    #         response = HttpResponse()
    #         response.status_code = 400
    #         return response

    # Get User and Practice
    user = request.session.get(USER_KEY, None)
    if user is not None:
        practice = user.practice
    else:
        practice = None

    if request.method == 'GET':
        items = get_items(get_model(model), practice)
    elif request.method == 'POST':
        #item = post_item(get_model(model), practice, data)
        return json_response({ 'uri': 'app/%s/some-id' % model, 'name': Data.load(request).name }) # stub
    elif request.method == 'PUT':
        #item = put_items(get_model(model), practice, data)
        return json_response({}) # stub
    else:
        response = json_response({})
        response.status_code = 400
        return response

    return json_response([
        dict(name='%s' % (i.name), uri='app/%s/%d' % (model, i.pk))
        for i in items
    ])

@login_required
def app_instance(request, model, id):
    # GET: Return item for given model
    # PUT: Update item for given model
    # DELETE: Delete item for given model

    # Get User and Practice
    user = request.session.get(USER_KEY, None)
    if user is not None:
        practice = user.practice
    else:
        practice = None

    # Process request
    if request.method == 'GET':
        item = get_item(get_model(model), practice, id)
    elif request.method == 'PUT':
        #item = put_item(get_model(model), practice, id, data)
        item = Data.load(request) # stub
    elif request.method == 'DELETE':
        #item = delete_item(get_model(model), practice, id)
        return json_response({}) # stub
    else:
        response = json_response({})
        response.status_code = 400
        return response

    return json_response({
        'name': '%s' % (item.name),
        'uri': 'app/%s/%d' % (model, int(id))
    })

class Data(object):
    """Stub: load JSON, wrap it in an object so it looks like a model
    instance."""

    @classmethod
    def load(cls, request):
        obj = cls()
        obj.__dict__.update(json.loads(request.raw_post_data))
        return obj

def json_response(obj):
    return HttpResponse(json.dumps(obj), mimetype='application/json')

@login_required
def reset_rooms(request):
    for r in Room.objects.all():
        r.assignedto.clear()
        r.notes.clear()
        r.procedures.clear()
        r.status = "C"
        r.timestampinqueue = None
        r.lasttimeinqueue = None
        r.save()
    for u in User.objects.all():
        u.num_accepted = 0
        u.save()
    return HttpResponseRedirect('/')

@login_required
def screen_display(request):
    try:
        practice = Practice.objects.get(account_name=practice)
    except Practice.DoesNotExist:
        practice = None
    if request.user.is_authenticated() and request.user.is_staff and practice is not None:
        return render_to_response('service/app/screen_display.html')
    else:
        return HttpResponseRedirect('/admin/')

@login_required
def alt_screen_display(request, practice):
    if request.user.is_authenticated() and request.user.is_staff:
        return render_to_response('service/app/alt_screen_display.html')
    else:
        return HttpResponseRedirect('/admin/')

def screen_display_js(request):
    return HttpResponse(json.dumps({'occupied': len(get_occupied_rooms(practice)), 'available': len(get_available_rooms(practice)), 'doctors':get_doctor_rooms(practice), 'nurses' : get_nurse_rooms(practice) }))

class PostTestForm(forms.Form):
    user = forms.ModelChoiceField(queryset=User.objects.all(), empty_label=None)
    room = forms.ModelChoiceField(queryset=Room.objects.all(), empty_label=None)



def post_test(request):
    form = PostTestForm()
    return render_to_response('service/app/post_test.html', {'form': form})

