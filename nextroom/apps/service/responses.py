# Python imports
try:
    import simplejson as json
except ImportError:
    import json

# Django imports
from django.db.models.query import QuerySet
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseNotFound

# NextRoom imports
from nextroom.apps.service.models import Practice

# CONSTANTS
USER_KEY = 'user'

#############################
#   NextRoom API Responses
#############################

def json_response(obj):
    ''' Returns serialized obj in HttpResponse
    Must package the response for serialization appropriately.
    
    '''
    if isinstance(obj, QuerySet):
        obj = [i.small_dict() for i in obj]
    elif isinstance(obj, Practice):
        obj = obj.as_dict()
    elif obj is None:
        obj = {}
    else:
        obj = obj.big_dict()
    return HttpResponse(json.dumps(obj), mimetype='application/json')

def bad_response(obj):
    print ">> bad_response"
    print obj
    return HttpResponseBadRequest(json.dumps({}), mimetype='application/json')

def not_found_response(obj):
    print ">> not_found_response"
    print obj
    return HttpResponseNotFound(json.dumps({}), mimetype='application/json')

def invalid_response(obj):
    print ">> invalid response"
    print obj
    return HttpResponseBadRequest(json.dumps({}), mimetype='application/json')