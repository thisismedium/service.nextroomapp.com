# Python imports
try:
    import simplejson as json
except ImportError:
    import json

# Django imports
from django.core.serializers import serialize

# NextRoom imports
from nextroom.apps.service.decorators import web_auth, api_request
from nextroom.apps.service.methods import process
from nextroom.apps.service.responses import json_response

# CONSTANTS
USER_KEY = 'user'

#######################################
#   NextRoom API Views
#######################################

@web_auth
@api_request
def account(request):
    # Processes & returns account-based requests
    return json_response(process(request), 'practice')

@web_auth
@api_request
def app_model(request, model):
    # Processes & returns model-based requests
    return json_response(process(request, model))


@web_auth
@api_request
def app_instance(request, model, id):
    # Process & returns instance-based requests
    return json_response(process(request, model, int(id)))
