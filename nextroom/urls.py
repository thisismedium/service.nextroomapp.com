from django.conf.urls.defaults import *
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    (r'^media/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT, 'show_indexes': True }),
    (r'^_admin/(.*)', admin.site.root),

    # svc/ URLs for iPhone app
    (r'^svc/', include('nextroom.apps.service.urls')),

    # API URLs
    (r'^admin/([^/]+)$', 'nextroom.apps.service.views.api.admin_model'),
    (r'^admin/([^/]+)/(\d+)$', 'nextroom.apps.service.views.api.admin_instance'),
    (r'^account/$', 'nextroom.apps.service.views.api.account'),
    (r'^reset-rooms/$', 'nextroom.apps.service.views.api.reset_rooms'),

    # Web URLs
    (r'^login/$', 'nextroom.apps.service.views.web.login'),
    (r'^logout/$', 'nextroom.apps.service.views.web.logout'),
    (r'^$', 'nextroom.apps.service.views.web.home'),

    # Extra for testing
    (r'^change-password/$', 'nextroom.apps.service.views.web.change_password'),

)



