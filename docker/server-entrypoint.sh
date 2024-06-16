#!/bin/bash
# entrypoint.sh

set -e  # Exit immediately if a command exits with a non-zero status

# Run database migrations
python manage.py makemigrations --noinput
python manage.py migrate --noinput

celery -A celery_app  worker -l info -c 4

# Execute the command passed as arguments (CMD in Dockerfile)
exec "$@"
