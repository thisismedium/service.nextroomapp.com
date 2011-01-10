# Python imports
import json

# Django imports
from django.core.serializers import serialize

# NextRoom imports
from nextroom.apps.service.decorators import web_auth, api_request, get_user
from nextroom.apps.service.methods import process
from nextroom.apps.service.responses import json_response
from nextroom.apps.service.models import Practice


# CONSTANTS
USER_KEY = 'user'

#######################################
#   NextRoom API Views
#######################################

@web_auth
@api_request
def account(request):
    # Processes & returns account-based requests
    user = get_user(request)
    return json_response(process(request, Practice, id=user.practice.pk), user)

@web_auth
@api_request
def app_model(request, model):
    # Processes & returns model-based requests
    return json_response(process(request, model, id=None), get_user(request))


@web_auth
@api_request
def app_instance(request, model, id):
    # Process & returns instance-based requests
    return json_response(process(request, model, int(id)), get_user(request))
