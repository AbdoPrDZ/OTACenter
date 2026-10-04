#!/usr/bin/env sh
set -e

cd /var/www/html

# Fall back to .env.example when no .env is mounted/supplied.
if [ ! -f .env ] && [ -f .env.example ]; then
    cp .env.example .env
fi

# Generate an application key on first boot if one is not supplied.
if [ -z "${APP_KEY:-}" ] && ! grep -q '^APP_KEY=base64:' .env 2>/dev/null; then
    php artisan key:generate --force --no-interaction || true
fi

# Writable runtime directories.
mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache \
         storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Public symlink so uploaded artifacts are reachable at /files/{name}.
php artisan storage:link >/dev/null 2>&1 || true

# Run migrations (skipped on the queue/scheduler containers with RUN_MIGRATIONS=false).
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "Running migrations..."
    i=1
    until php artisan migrate --force --no-interaction; do
        if [ "$i" -ge 30 ]; then
            echo "Database did not become ready in time." >&2
            exit 1
        fi
        echo "  database not ready (attempt $i/30), retrying in 2s..."
        i=$((i + 1))
        sleep 2
    done
fi

# Configuration caches.
php artisan config:clear >/dev/null 2>&1 || true
if [ "${APP_ENV:-production}" = "production" ]; then
    php artisan config:cache >/dev/null 2>&1 || true
    php artisan view:cache   >/dev/null 2>&1 || true
fi

exec "$@"
