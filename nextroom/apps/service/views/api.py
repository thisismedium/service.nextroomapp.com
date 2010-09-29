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
from nextroom.apps.service.decorators import (web_auth, model_method)
from nextroom.apps.service.screendisplay import *
from nextroom.apps.service.models import *

# CONSTANTS
USER_KEY = 'user'

#######################################
#   Helper methods
#######################################

def json_response(obj):
    return HttpResponse(json.dumps(obj), mimetype='application/json')

def bad_response():
    response = json_response({})
    response.status_code = 400
    return response

@model_method
def get_items(model, practice):
    # Return all objects for given model & practice
    try:
        return model.objects.filter(practice=practice).order_by('sort_order', 'name')
    except AttributeError:
        return []

@model_method
def get_item(model, practice, id):
    # Return object for given model, practice, & id
    try:
        return model.objects.get(id=id)
    except model.DoesNotExist:
        return None

@model_method
def post_item(model, practice, data):
    # Create a new object for given model & practice
    # Returns new item after save, else None
    pass

@model_method
def put_items(model, practice, data):
    # Re-sort all objects for given model & practice
    # Returns None
    pass

@model_method
def put_item(model, practice, id, data):
    # Update given object for model, practice, & id with data
    # Returns updated object
    pass

@model_method
def delete_item(model, practice, id, user):
    # Delete object for model & practice
    # Returns True if delete() succeeds, else False
    try:
        item = model.objects.get(id=id, practice=practice)
    except model.DoesNotExist:
        err = NotFound()
        err.offender = None
        err.message = "User Not Found"
        raise err
    else:
        if item != user:
            item.delete()
            return True
        else:
            return False

#######################################
#   API views
#######################################

@web_auth
def app_model(request, model):
    # GET: Return list of items for given model
    # POST: Create a new object for given model
    # PUT: Update sort_order for given model

    if request.META['CONTENT_TYPE'] == 'application/json':
        # Get User and Practice
        user = request.session.get(USER_KEY, None)
        if user is not None:
            practice = user.practice
        else:
            practice = None

        if request.method == 'GET':
            items = get_items(model, practice)
        elif request.method == 'POST':
            #item = post_item(model, practice, data)
            return json_response({ 'uri': 'app/%s/some-id' % model, 'name': Data.load(request).name }) # stub
        elif request.method == 'PUT':
            print request.raw_post_data
            #item = put_items(model, practice, data)
            return json_response({}) # stub
        else:
            # Bad verb. Return 400
            return bad_response()

        return json_response([
            dict(name='%s' % (i.name), uri='app/%s/%d' % (model, i.pk))
            for i in items
        ])
    else:
        return bad_response()
    

@web_auth
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
        item = get_item(model, practice, id)
    elif request.method == 'PUT':
        #item = put_item(model, practice, id, data)
        item = Data.load(request) # stub
    elif request.method == 'DELETE':
        item = delete_item(model, practice, id, user)
        return json_response({}) # stub
    else:
        return bad_response()

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
