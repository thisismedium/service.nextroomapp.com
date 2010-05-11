#!/bin/sh
HOST=$1; shift;
PORT=$1; shift;
(cd ./wsgi;
export PYTHONPATH=lib;
export DJANGO_SETTINGS_MODULE=nextroom.host_settings.localhost ;
exec python2.5 ./runserver $HOST $PORT)
