from django.conf.urls.defaults import *
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    (r'^media/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT, 'show_indexes': True }),
    (r'^admin/(.*)', admin.site.root),
)

urlpatterns += patterns('nextroom.apps.roomqueue.views',
    (r'^rooms/', 'get_rooms'),
    (r'^room/', 'get_room'),
    (r'^notes/', 'get_tags', {'type': 'note'}),
    (r'^procedures/', 'get_tags', {'type': 'procedure'}),
    (r'^users/', 'get_users'),
    (r'^update/', 'update_room'),
    (r'^post/', 'post_test'),
)

