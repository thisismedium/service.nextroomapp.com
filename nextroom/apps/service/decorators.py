# Python imports
try:
    import simplejson as json
except ImportError:
    import json
import functools

# NextRoom imports
from nextroom.apps.service.exceptions import *
from nextroom.apps.service.models import PUBLIC, ApiModel, User
from nextroom.apps.service.responses import *

# Constants
USER_KEY = 'user'

################################
#   Decorator helpers
################################

def get_model(model):
    # Return model based on URL arg
    if isinstance(model, unicode):
        return PUBLIC.get(model)
    else:
        return model

def stringify_dict_keys(dct, practice):
    d = {}
    for key,val in dct.items():
        d[str(key)] = val
    d['practice'] = practice
    return d

def get_user(request):
    user = request.session.get(USER_KEY, None)
    if user is not None:
        return user
    else:
        raise BadRequest("No User.")

def get_request_data(request):
    # Returns data with str keys
    try:
        return stringify_dict_keys(json.loads(request.raw_post_data), get_user(request).practice)
    except ValueError:
        # No raw_post_data
        return None

################################
#   Decorators
################################

def auth_decorator(is_app):
    ''' Verifies request is from an authenticated user
     is_app flag returns a special response for iPhone app
     This will likely go away when app uses new API
    
    '''
    def decorator(view):
        # Verify app user is authenticated & valid
        @functools.wraps(view)
        def internal(request, *args, **kwargs):
            u = request.session.get(USER_KEY)
            if isinstance(u, User):
                return view(request, *args, **kwargs)
            else:
                from nextroom.apps.service.views.app import throw_xml_error
                from nextroom.apps.service.views.web import login
                if is_app:
                    return throw_xml_error()
                else:
                    return login(request)
        return internal
    return decorator

app_auth = auth_decorator(True)
web_auth = auth_decorator(False)

def model_method(method):
    # Provides a consistent interface for calling API methods
    # Passes in the actual model to perform method() on
    @functools.wraps(method)
    def internal(model, *args, **kwargs):
        return method(get_model(model), *args, **kwargs)
    return internal

def api_request(method):
    # Provides a consistent interface for handling API requests
    # Attempts to execute the method or handle error responses
    @functools.wraps(method)
    def internal(request, *args, **kwargs):
        if request.META['CONTENT_TYPE'] == 'application/json':
            # This is good. Process request
            try:
                return method(request, *args, **kwargs)
            except BadRequest, e:
                return bad_response(e)
            except NotFound, e:
                return not_found_response(e)
            except Invalid, e:
                return invalid_response(e)
            except:
                import traceback
                traceback.print_exc()
                raise
        else:
            raise BadRequest()
        
    return internal

def pre_process(method):
    # Provides extra context for process functions
    @functools.wraps(method)
    def internal(request, model, id=None, *args, **kwargs):
        user = get_user(request)
        data = get_request_data(request)
        return method(request, model, id, user, data, *args, **kwargs)
    return internal