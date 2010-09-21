from django.conf.urls.defaults import *

urlpatterns = patterns('apps.service.views',
    (r'^auth/', 'app_login'),
    (r'^rooms/', 'get_rooms'),
    (r'^room/', 'get_room'),
    (r'^notes/', 'get_tags', {'type': 'note'}),
    (r'^tasks/', 'get_tags', {'type': 'task'}),
    (r'^users/(?P<practice>.*)/', 'get_users'),
    (r'^update/', 'update_room'),
    (r'^alt-screen-display/', 'alt_screen_display'),
    (r'^reset-rooms/', 'reset_rooms'),
    (r'^screen-display-js/','screen_display_js'),
    (r'^post/', 'post_test'),
    (r'^pin_check/', 'pin_check'),
    (r'^name_check/(?P<practice>.*)/', 'verify_account_exists'),
    (r'^$', 'screen_display'),
)