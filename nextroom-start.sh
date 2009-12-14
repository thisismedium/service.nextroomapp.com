#!/bin/sh
cd ./wsgi
export DJANGO_SETTINGS_MODULE=nextroom.host_settings.localhost && python ./runserver localhost 8080