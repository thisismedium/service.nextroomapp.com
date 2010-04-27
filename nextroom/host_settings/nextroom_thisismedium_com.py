from common import *
DATABASE_ENGINE = 'postgresql_psycopg2'           # 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
DATABASE_NAME = 'nextroom_jdev'             # Or path to database file if using sqlite3.
DATABASE_USER = 'nextroom_jdev'             # Not used with sqlite3.
DATABASE_PASSWORD = SECRET_KEY         # Not used with sqlite3.
DATABASE_HOST = 'psqlhost'             # Set to empty string for localhost. Not used with sqlite3.
DATABASE_PORT = ''             # Set to empty string for default. Not used with sqlite3.
DEBUG = False
#DATABASE_ENGINE='sqlite3'
#DATABASE_NAME='/www/data/nextroom.thisismedium.com/data.db'
