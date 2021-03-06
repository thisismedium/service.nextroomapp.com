# Python imports
import json

# Django imports
from django.core.exceptions import FieldError

# NextRoom imports
from nextroom.apps.service.decorators import model_method, pre_process
from nextroom.apps.service.exceptions import *
from nextroom.apps.service.models import *

# CONSTANTS
USER_KEY = 'user'

#######################################
#   NextRoom API Methods
#######################################

def is_account(model):
    return model.__name__.lower() == 'practice'

@model_method
def api_get(model, id=None, user=None):
    # GET model/instance object(s)
    if is_account(model):
        # This is a special case for editing a Practice
        return user.practice
    if id is not None:
        try:
            return model.objects.get(id=id, practice=user.practice)
        except model.DoesNotExist:
            raise NotFound("Cannot find the item requested.")
    else:
        try:
            return model.objects.filter(practice=user.practice).order_by('sort_order', 'name')
        except:
            raise BadRequest("Cannot find the items requested.")

@model_method
def api_post(model, id=None, user=None, data=None):
    # POST new model instance
    if is_account(model):
        raise BadRequest("Cannot POST an account.")

    if id is None and data is not None:
        # Create a new instance
        item = model(**data)

        # Validate or die
        item.validate()
        if item.errors:
            # Die
            raise Invalid(item.errors)
        else:
            # Save
            item.save()
            return item
    else:
        # Cannot POST to an instance.
        raise BadRequest("Cannot POST to an existing instance. Use PUT instead.")

@model_method
def api_put(model, id=None, user=None, data=None):
    # PUTs data to model/instance:
    #   if model: update sort order
    #   if instance: update instance
    if data is not None:
        if id is not None:
            # Update item data
            item = api_get(model, id, user)
            item.update(data)
            item.validate()
            if item.errors:
                raise Invalid(item.errors)
            else:
                item.save()
                return item
        else:
            # Re-sort model's items
            for index, obj in enumerate(data):
                key = int(obj['uri'].split('/')[2])
                item = api_get(model, key, user)
                item.sort_order = index
                item.save()
            return None
    else:
        raise BadRequest("No data provided for PUT.")

@model_method
def api_delete(model, id, user):
    # DELETE object for model & practice
    # Returns None
    if not is_account(model):
        item = api_get(model, id, user)
        if item != user:
            item.delete()
            return None
        else:
            raise BadRequest("Cannot delete oneself.")
    else:
        raise BadRequest("Cannot delete an account.")

@pre_process
def process(request, model, id=None, user=None, data=None):
    # Processes API requests for app models
    # Call methods based on HTTP verbs
    if request.method == 'GET':
        return api_get(model, id, user)
    elif request.method == 'POST' and model != 'practice':
        return api_post(model, id, user, data)
    elif request.method == 'PUT':
        return api_put(model, id, user, data)
    elif request.method == 'DELETE' and model != 'practice':
        return api_delete(model, id, user)
    else:
        # Bad verb -- shouldn't happen for models, but we're double-bagging it anyway. ;)
        raise BadRequest("Bad verb.")
