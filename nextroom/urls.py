from django.conf.urls.defaults import *
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    (r'^media/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT, 'show_indexes': True }),
    (r'^admin/(.*)', admin.site.root),
    
    # svc/ URLs for iPhone app
    (r'^svc/', include('apps.service.urls')),
    
    # API URLs
    (r'^app/([^/]+)$', 'apps.service.views.api.app_model'),
    (r'^app/([^/]+)/(\d+)$', 'apps.service.views.api.app_instance'),
    (r'^account/$', 'apps.service.views.api.account'),
    
    # Web URLs
    (r'^login/$', 'apps.service.views.web.login'),
    (r'^logout/$', 'apps.service.views.web.logout'),
    (r'^$', 'apps.service.views.web.home'),

    # Extra for testing
    (r'^change-password/$', 'django.views.generic.simple.direct_to_template', {'template': 'service/admin/change_password.html', 'extra_context': {'media': '%sservice/' % settings.MEDIA_URL}}),
        
)



