#!/bin/sh
set -e

if [ "$1" = "python3" ]; then
  flask --app run.py db upgrade
  flask --app run.py seed-roles
  flask --app run.py seed-admin
fi

exec "$@"