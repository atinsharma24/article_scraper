#!/bin/sh
set -e

: "${PORT:=10000}"

if [ ! -f artisan ]; then
  echo "artisan not found; is this a Laravel app?"
  exit 1
fi

php artisan migrate --force || true

php -S 0.0.0.0:${PORT} -t public
