# Laravel backend — production Dockerfile.
#
# Multi-stage build:
#   1. vendor/  — install Composer dependencies against PHP 8.2-cli
#   2. app/     — copy the codebase + vendor and run php-fpm
#
# Run with:
#   docker build -f deploy/laravel/Dockerfile -t minassati-laravel:tag .
#   docker run --env-file backend/.env -p 9000:9000 minassati-laravel:tag
#
# Compose this image with an nginx sidecar (deploy/laravel/docker-compose.yml)
# for TLS termination and static-file serving.
#
# RELIABILITY-MAJOR-04: gives the Laravel backend a deployable artifact
# to go alongside the VOD engine. The legacy `start-server.ps1` script
# remains for local Windows dev; production runs this image.

# ============================================================================
# Stage 1: composer install
# ============================================================================
FROM composer:2.7 AS vendor

WORKDIR /app

# Copy only the composer manifests first so the dependency layer is cached
# when only source files change.
COPY backend/composer.json backend/composer.lock /app/

# `--no-dev` keeps the production image lean. `--no-scripts` skips Laravel
# post-install hooks that touch .env (which doesn't exist yet at build time).
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-interaction \
        --prefer-dist \
        --optimize-autoloader

# ============================================================================
# Stage 2: runtime
# ============================================================================
FROM php:8.2-fpm-bookworm AS app

# System dependencies required by the Laravel app:
#   - nginx for TLS + static files
#   - supervisor for php-fpm + queue worker + reverb in one process tree
#   - mysql client for `php artisan migrate` (in entrypoint)
#   - libzip-dev for `composer require league/flysystem-aws-s3-v3` zip support
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx \
        supervisor \
        default-mysql-client \
        libzip-dev \
        unzip \
        git \
        curl \
        ca-certificates \
    && docker-php-ext-install pdo pdo_mysql zip opcache \
    && rm -rf /var/lib/apt/lists/*

# Sane production PHP settings.
RUN { \
        echo 'memory_limit = 512M'; \
        echo 'upload_max_filesize = 1024M'; \
        echo 'post_max_size = 1024M'; \
        echo 'max_execution_time = 120'; \
        echo 'opcache.enable = 1'; \
        echo 'opcache.memory_consumption = 192'; \
        echo 'opcache.max_accelerated_files = 20000'; \
        echo 'opcache.validate_timestamps = 0'; \
    } > /usr/local/etc/php/conf.d/laravel.ini

WORKDIR /var/www/html

# Copy the application code.
COPY --chown=www-data:www-data backend/ /var/www/html/

# Bring in the production-only vendor tree from stage 1.
COPY --from=vendor --chown=www-data:www-data /app/vendor /var/www/html/vendor

# Pre-create the writable directories Laravel needs at runtime.
RUN mkdir -p \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/testing \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

# Pre-build the optimized autoloader and the route/config/view cache.
# This makes the container start in tens of milliseconds instead of seconds.
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

# Drop privileges for the runtime.
USER www-data

# Expose php-fpm; nginx lives in the same container and proxies through
# to php-fpm on 9000 (loopback only). The host binds 8080 -> container 80.
EXPOSE 9000

# The default php-fpm entrypoint is fine; supervisor is started by the
# docker-compose sidecar. If you run this image standalone, add a
# CMD that starts php-fpm in the foreground.
CMD ["php-fpm"]
