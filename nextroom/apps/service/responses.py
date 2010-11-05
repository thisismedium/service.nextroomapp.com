# Python imports
try:
    import simplejson as json
except ImportError:
    import json

# Django imports
from django.db.models.query import QuerySet
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseNotFound

# NextRoom imports
from nextroom.apps.service.models import Practice, User

# CONSTANTS
USER_KEY = 'user'

#############################
#   NextRoom API Responses
#############################

def json_response(obj, curr_user=None):
    ''' Returns serialized obj in HttpResponse
    Must package the response for serialization appropriately.
    
    '''
    if isinstance(obj, QuerySet):
        if isinstance(obj[0], User):
            obj = [i.small_dict(curr_user) for i in obj]
        else:
            obj = [i.small_dict() for i in obj]
    elif isinstance(obj, Practice):
        obj = obj.as_dict()
    elif obj is None:
        obj = {}
    else:
        print obj
        obj = obj.big_dict()
    return HttpResponse(json.dumps(obj), mimetype='application/json')

def bad_response(obj):
    return HttpResponseBadRequest(json.dumps({}), mimetype='application/json')

def not_found_response(obj):
    return HttpResponseNotFound(json.dumps({}), mimetype='application/json')

def invalid_response(obj):
    print "invalid: %s" % obj.args
    return HttpResponseBadRequest(json.dumps(obj.args), mimetype='application/json')