#!/bin/sh
# entrypoint.sh

envsubst '$SSL_CERT_FILE $SSL_KEY_FILE' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
nginx -g 'daemon off;'