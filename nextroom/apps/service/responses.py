# Python imports
try:
    import simplejson as json
except ImportError:
    import json

# Django imports
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseNotFound

# CONSTANTS
USER_KEY = 'user'

#############################
#   NextRoom API Responses
#############################

def json_response(obj):
    print ">> json_response()"
    print obj
    return HttpResponse(json.dumps(obj), mimetype='application/json')

def bad_response():
    return HttpResponseBadRequest(json.dumps({}), mimetype='application/json')

def not_found_response():
    return HttpResponseNotFound(json.dumps({}), mimetype='application/json')

def invalid_response():
    return HttpResponseBadRequest(json.dumps({}), mimetype='application/json')