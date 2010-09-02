from django.contrib import admin
from django.contrib.auth.models import User as djUser, Group
from django.contrib.sites.models import Site
from nextroom.apps.service.models import Practice, Version, Note, Procedure, User, Room
from nextroom.apps.service.customfields import ColorPickerWidget, ColorField

#admin.site.register(Version)
admin.site.unregister(djUser)
admin.site.unregister(Group)
admin.site.unregister(Site)
admin.site.register(Practice)
admin.site.register(Note)
admin.site.register(Procedure)

class UserAdmin(admin.ModelAdmin):
    formfield_overrides = {
        ColorField: {'widget': ColorPickerWidget}
    }
    
admin.site.register(User)
admin.site.register(Room)