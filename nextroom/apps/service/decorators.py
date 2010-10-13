import functools
from nextroom.apps.service.exceptions import *
from nextroom.apps.service.models import PUBLIC, ApiModel, User
from nextroom.apps.service.responses import *

USER_KEY = 'user'

################################
#   Helper methods
################################

def get_model(model):
    # Return model based on URL arg
    if isinstance(model, unicode):
        return PUBLIC.get(model)
    else:
        return model

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
            except BadRequest:
                return bad_response()
            except NotFound, e:
                return not_found_response()
            except Invalid, e:
                return invalid_response()
        else:
            raise BadRequest()
        
    return internal