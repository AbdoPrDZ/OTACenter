# syntax=docker/dockerfile:1

############################################################
# Stage 1 — build the frontend (Vite -> public/build)      #
############################################################
FROM node:20-alpine AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

############################################################
# Stage 2 — runtime: nginx + php-fpm + the Laravel app     #
############################################################
FROM php:8.4-fpm

# System libraries + PHP extensions this app needs.
RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx supervisor curl unzip \
      libldap2-dev libzip-dev libpq-dev libsqlite3-dev \
      libonig-dev libcurl4-openssl-dev \
    && docker-php-ext-install -j"$(nproc)" \
      pdo_pgsql pdo_mysql pdo_sqlite zip ldap bcmath opcache mbstring curl pcntl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Composer (run inside the runtime image so platform checks match the extensions).
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# PHP / nginx / supervisor configuration.
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/nginx/default.conf /etc/nginx/sites-available/default
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

WORKDIR /var/www/html

# Dependencies first (better layer caching).
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist \
      --optimize-autoloader --no-scripts

# Application code + the frontend build output from stage 1.
COPY . .
COPY --from=assets /app/public/build ./public/build

RUN mkdir -p storage/framework/{sessions,views,cache} storage/logs bootstrap/cache \
    && rm -f bootstrap/cache/*.php \
    && chown -R www-data:www-data storage/framework storage/logs bootstrap/cache \
    && php artisan package:discover --ansi

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1/ >/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
