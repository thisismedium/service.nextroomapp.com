# Python imports
try:
    import simplejson as json
except ImportError:
    import json

# Django imports
from django.core.serializers import deserialize
from django.http import QueryDict

# NextRoom imports
from nextroom.apps.service.decorators import model_method
from nextroom.apps.service.exceptions import *
from nextroom.apps.service.models import *

# CONSTANTS
USER_KEY = 'user'

#######################################
#   NextRoom API Methods
#######################################

def stringify_dict_keys(dct):
    d = {}
    for key,val in dct.items():
        d[str(key)] = val
    return d

@model_method
def api_get(model, practice, id=None):
    print "*** api_get() ***"
    if id is not None:
        # Try to return given item
        try:
            return model.objects.get(id=id, practice=practice)
        except model.DoesNotExist:
            raise NotFound("Cannot find the item requested.")
    else:
        # Try to return all items
        try:
            return model.objects.filter(practice=practice).order_by('sort_order', 'name')
        except AttributeError:
            raise BadRequest("Model does not exist.")

@model_method
def api_post(model, practice, data, id=None):
    print "*** api_post() ***"
    if id is not None:
        # Cannot POST to an instance.
        raise BadRequest("Cannot POST to an existing instance.")
    else:
        # Create a new instance
        item = model(**data)
        item.save()
        return item

@model_method
def api_put(model, practice, data=None, id=None):
    print "*** api_put() ***"
    if data is not None:
        if id is not None:
            # Update given item
            item = api_get(model, practice, id)
            item = model(id=id, practice=practice, **stringify_dict_keys(data))
            item.save()
            print "saved!"
            return item
        else:
            # Resort all items for given model
            items = api_get(model, practice, id)
            print ">> sort items"
            return None
    else:
        raise BadRequest("No data provided for PUT.")

@model_method
def api_delete(model, practice, id, user):
    print "*** api_delete() ***"
    # Delete object for model & practice
    # Returns True if delete() succeeds, else False
    item = api_get(model, practice, id)
    print "DELETE: %s" % item
    if item != user:
        item.delete()
        return True
    else:
        return False


def process(request, model, id=None):
    # Handles actual processing of API requests
    # Views simply pass their args & kwargs to process()
    
    user = request.session.get(USER_KEY, None)
    if user is not None:
        practice = user.practice
    else:
        raise BadRequest("No User.")
    
    # Set data from raw_post_data because Django only has objects for GET & POST verbs
    try:
        data = json.loads(request.raw_post_data)
    except ValueError:
        data = None
    
    # Call methods based on HTTP verbs
    if request.method == 'GET':
        return api_get(model, practice, id)
    elif request.method == 'POST':
        return api_post(model, practice, data, id)
    elif request.method == 'PUT':
        return api_put(model, practice, data, id)
    elif request.method == 'DELETE':
        return api_delete(model, practice, id, user)
    else:
        # Bad verb -- shouldn't happen, but we're double-bagging it anyway.
        raise BadRequest("Bad HTTP Verb.")

