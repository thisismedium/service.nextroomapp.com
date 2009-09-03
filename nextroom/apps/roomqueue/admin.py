from django.contrib import admin

from nextroom.apps.roomqueue.models import Version, Note, Procedure, User, Room
from nextroom.apps.roomqueue.customfields import ColorPickerWidget, ColorField

admin.site.register(Version)
admin.site.register(Note)
admin.site.register(Procedure)

class UserAdmin(admin.ModelAdmin):
    formfield_overrides = {
        ColorField: {'widget': ColorPickerWidget}
    }
    
admin.site.register(User)
admin.site.register(Room)