#!/bin/sh

if [ "$#" -gt 0 ]; then
  exec certbot "$@"
fi

while true; do
  certbot renew --webroot -w /var/www/certbot --deploy-hook "nginx -s reload"
  sleep 12h
done
