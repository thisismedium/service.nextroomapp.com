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
    (r'^$/', 'screen_display'),
    (r'^alt-screen-display/', 'alt_screen_display'),
    (r'^reset-rooms/', 'reset_rooms'),
    (r'^screen-display-js/','screen_display_js'),
    (r'^post/', 'post_test'),
)

