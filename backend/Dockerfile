# Laravel backend (Render Web Service)

FROM php:8.4-cli-alpine

RUN apk add --no-cache \
    bash curl git unzip icu-dev libpq-dev oniguruma-dev \
    && docker-php-ext-install pdo pdo_pgsql intl mbstring \
    && rm -rf /var/cache/apk/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

# Laravel needs these directories to exist and be writable when Composer runs
# post-install scripts (e.g. `artisan package:discover`).
RUN mkdir -p \
    bootstrap/cache \
    storage/app \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    && chmod -R 775 bootstrap/cache storage \
    && chown -R www-data:www-data bootstrap/cache storage || true

# Install PHP dependencies. Copying the full app before install ensures `artisan` exists
# when Composer runs Laravel's post-install scripts.
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

EXPOSE 10000

CMD ["sh", "./render-start.sh"]
