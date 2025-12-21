# Laravel backend (Render Web Service)

FROM php:8.4-cli-alpine

RUN apk add --no-cache \
    bash curl git unzip icu-dev libpq-dev oniguruma-dev \
    && docker-php-ext-install pdo pdo_pgsql intl mbstring \
    && rm -rf /var/cache/apk/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

COPY . .

EXPOSE 10000

CMD ["sh", "./render-start.sh"]
