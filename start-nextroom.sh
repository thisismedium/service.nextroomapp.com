#!/bin/sh
HOST=$1; shift;
PORT=$1; shift;
cd ./wsgi
export DJANGO_SETTINGS_MODULE=nextroom.host_settings.localhost && exec python ./runserver $HOST $PORT
