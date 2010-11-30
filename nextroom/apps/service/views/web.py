# Python imports
try:
    import simplejson as json
except ImportError:
    import json

# Django imports
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import RequestContext
from django import forms

# NextRoom imports
from nextroom.apps.service.decorators import (web_auth)
from nextroom.apps.service.screendisplay import *
from nextroom.apps.service.models import *

# CONSTANTS
USER_KEY = 'user'

################################
#   Helper methods
################################

def authenticate(email=None, password=None):
    # Verifies an email/password combination is correct
    # Returns User object if found, else None
    users = User.objects.filter(email=email)
    user = None
    for u in users:
        if u.check_password(password):
            user = u
            break
    else:
        user = None
    return user

#######################################
#   Web Admin views
#######################################

def login(request):
    # Authenticate admin user
    valid, user = True, request.session.get(USER_KEY)
    if isinstance(user, User):
        return HttpResponseRedirect('/#app')
    
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
    
    return render_to_response('service/admin/login.html', {
        'valid':valid,
        'media': '%sservice/' % settings.MEDIA_URL
    })

def logout(request):
    # Clears the user from the session
    request.session[USER_KEY] = None
    return HttpResponseRedirect('/')

@web_auth
def home(request):
    # Returns admin landing page for authenticated user
    user = request.session.get(USER_KEY, None)
    return render_to_response('service/admin/base.html', {
        'user': user,
        'user_types': User.TYPE_CHOICES,
        'add_types': User.ADD_CHOICES,
        'media': '%sservice/' % settings.MEDIA_URL
    })

#######################################
#   Deprecated views
#######################################

@web_auth
def reset_rooms(request):
    # Resets Rooms at end of day
    for r in Room.objects.all():
        r.assignedto.clear()
        r.notes.clear()
        r.tasks.clear()
        r.status = "C"
        r.timestampinqueue = None
        r.lasttimeinqueue = None
        r.save()
    for u in User.objects.all():
        u.num_accepted = 0
        u.save()
    return HttpResponseRedirect('/')

@web_auth
def screen_display(request):
    try:
        practice = Practice.objects.get(account_name=practice)
    except Practice.DoesNotExist:
        practice = None
    if request.user.is_authenticated() and request.user.is_staff and practice is not None:
        return render_to_response('service/app/screen_display.html')
    else:
        return HttpResponseRedirect('/admin/')

@web_auth
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

