from common import *
from os.path import *

PROJECT_DIR = dirname(dirname(abspath(__file__)))
DEBUG = True
TEMPLATE_DEBUG = DEBUG

DATABASE_ENGINE = 'postgresql_psycopg2'           # 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
DATABASE_NAME = 'nextroom'             # Or path to database file if using sqlite3.
DATABASE_USER = 'nextroom'             # Not used with sqlite3.
DATABASE_PASSWORD = ''         # Not used with sqlite3.
DATABASE_HOST = 'parent'             # Set to empty string for localhost. Not used with sqlite3.
DATABASE_PORT = ''             # Set to empty string for default. Not used with sqlite3.

ROOT_URLCONF = 'nextroom.urls'

TEMPLATE_DIRS = (
    join(PROJECT_DIR, 'templates')
)

MEDIA_URL = '/media/'