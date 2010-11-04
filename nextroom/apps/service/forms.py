from django.forms import *
from nextroom.apps.service.models import *

class PracticeForm(ModelForm):
    pass

class ApiForm(ModelForm):
    
    class Meta:
        model = ApiModel


class UserForm(ApiForm):
    pass

class RoomForm(ApiForm):
    pass
