#############################
#   NextRoom API Exceptions
#############################

class BadRequest(Exception):
    ''' Thrown when incorrect/failed requests occur
    
    '''
    pass

class NotFound(Exception):
    ''' Thrown when an attempt is made to modify an item that does not exist.
    
    '''
    pass

class Invalid(Exception):
    ''' Thrown when an invalid operation occurs
    Example: Form errors
    
    '''