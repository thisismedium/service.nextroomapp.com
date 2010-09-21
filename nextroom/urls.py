from django.conf.urls.defaults import *
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    (r'^media/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT, 'show_indexes': True }),
    (r'^admin/(.*)', admin.site.root),
    (r'^svc/', include('apps.service.urls')),
    (r'^(?P<model>)/list', 'apps.service.views.get_item_list'),
    (r'^$', 'apps.service.admin')
)



