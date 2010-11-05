from django.forms import *
from nextroom.apps.service.models import *

class PracticeForm(ModelForm):
    pass

class ApiForm(Form):
    name = CharField(max_length=256)
    
    def clean_name(self):
        n = self.cleaned_data['name']
        if n == '':
            raise ValidationError("Name is required")
        
        return n


class UserForm(ApiForm):
    pass

class RoomForm(ApiForm):
    pass
