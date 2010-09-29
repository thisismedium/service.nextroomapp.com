import functools
from nextroom.apps.service.models import PUBLIC, User

USER_KEY = 'user'

################################
#   Helper methods
################################

def get_model(model):
    # Return model based on URL arg
    return PUBLIC.get(model)

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
                otherwise(request)
        return internal
    return decorator

app_auth = auth_decorator(True)
web_auth = auth_decorator(False)

def model_method(method):
    # Makes a consistent interface for calling API methods
    # Passes in the actual model to perform method() on
    @functools.wraps(method)
    def internal(model, *args, **kwargs):
        return method(get_model(model), *args, **kwargs)
    return internal




###### STUBBING OUT REQUEST DECORATOR

def api_request(method, format):
    try:
        result = method()
    except BadRequest:
        return bad_response(format)
    except NotFound, e:
        return not_found_response(format)
    except Invalid, e:
        return invalid_response(format)
    
    return good_response(result, format)