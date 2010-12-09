APPLICATION_NAME = "NextRoom"

LOGIN_URL = '/admin/login/'
LOGIN_REDIRECT_URL = '/admin/'

SECRET_KEY = 'l2jck#tvpr%@xz-x$(vx#6(1^dmk4-nbjvf43a!s6=h^sfy$5t'

AUTHENTICATION_BACKENDS = (
    'pykk.auth.backends.HtpasswdBackend',
    'django.contrib.auth.backends.ModelBackend'
)

MIDDLEWARE_CLASSES = (
    'servermedium.django.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'pykk.apps.auth.middleware.AuthenticationMiddleware',
    'nextroom.middleware.headers.AddHeaderMiddleware',
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.admin',
    'nextroom.apps.service',
)

EMAIL_HOST = 'relay.smtp.coptix.com'
EMAIL_PORT = 25

PASSWORD_RECOVERY_SENDER = 'info@nextroomapp.com'