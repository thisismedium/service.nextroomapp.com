# Python imports
try:
    import simplejson as json
except ImportError:
    import json

# Django imports
from django.core.serializers import serialize

# NextRoom imports
from nextroom.apps.service.decorators import web_auth, api_request
from nextroom.apps.service.exceptions import *
from nextroom.apps.service.methods import *
from nextroom.apps.service.responses import *

# CONSTANTS
USER_KEY = 'user'

#######################################
#   NextRoom API Views
#######################################

@web_auth
@api_request
def app_model(request, model):
    
    res = process(request, model)
    return json_response([
        i.small_dict() for i in res
    ])


@web_auth
@api_request
def app_instance(request, model, id):

    res = process(request, model, int(id))
    return json_response(res.big_dict())
