#!/bin/bash

# ContainerStacks: WordPress on Ubuntu 24.04 LTS
#
# <UDF name="admin_username" label="WordPress admin username" example="admin" default="admin" />
# <UDF name="admin_password" label="WordPress admin password" example="strong-password" />
# <UDF name="admin_email" label="Admin email" example="admin@example.com" />
# <UDF name="db_name" label="Database name" default="wordpress" />
# <UDF name="db_user" label="Database user" default="wordpress" />
# <UDF name="db_password" label="Database password" example="db-strong-password" />
# <UDF name="site_title" label="Site title" default="My Blog" />
# <UDF name="sudo_user" label="Limited sudo user (no caps/special chars)" default="wordpress" />

set -euo pipefail
LOG_FILE="/root/stackscript.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "[+] Starting WordPress StackScript (Ubuntu 24.04)"

# Use UDF variables directly (they're already set as environment variables)
# Provide defaults if not set
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-changeme}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
DB_NAME=${DB_NAME:-wordpress}
DB_USER=${DB_USER:-wordpress}
DB_PASSWORD=${DB_PASSWORD:-wordpress}
SITE_TITLE=${SITE_TITLE:-"My Blog"}
SUDO_USER=${SUDO_USER:-wordpress}

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "[+] Installing Nginx, MySQL, PHP, and utilities"
apt-get install -y nginx mysql-server php-fpm php-mysql php-cli php-curl php-zip php-xml php-mbstring unzip curl

systemctl enable nginx
systemctl enable mysql
systemctl enable php8.3-fpm || systemctl enable php8.2-fpm || true
systemctl start mysql
systemctl start php8.3-fpm || systemctl start php8.2-fpm || true
systemctl start nginx

echo "[+] Securing MySQL and creating database/user"
# Use sudo to run mysql as root without password prompt
mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "[+] Installing WP-CLI"
curl -sS https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -o /usr/local/bin/wp
chmod +x /usr/local/bin/wp

echo "[+] Downloading and configuring WordPress"
WEB_ROOT="/var/www/wordpress"
mkdir -p "$WEB_ROOT"
cd "$WEB_ROOT"

# Run wp-cli as root but allow it
wp core download --allow-root --quiet || wp core download --allow-root

# Create wp-config.php
wp config create \
  --dbname="$DB_NAME" \
  --dbuser="$DB_USER" \
  --dbpass="$DB_PASSWORD" \
  --dbhost=localhost \
  --allow-root

# Set proper ownership
chown -R www-data:www-data "$WEB_ROOT"
find "$WEB_ROOT" -type d -exec chmod 755 {} \;
find "$WEB_ROOT" -type f -exec chmod 644 {} \;

echo "[+] Configuring Nginx server block"
# Detect PHP version
PHP_VERSION=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
PHP_SOCK="/run/php/php${PHP_VERSION}-fpm.sock"

cat >/etc/nginx/sites-available/wordpress <<NGINX
server {
    listen 80 default_server;
    server_name _;
    root $WEB_ROOT;

    index index.php index.html index.htm;

    location / {
        try_files \$uri \$uri/ /index.php?\$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:$PHP_SOCK;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        expires max;
        log_not_found off;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/wordpress /etc/nginx/sites-enabled/wordpress
rm -f /etc/nginx/sites-enabled/default || true
nginx -t && systemctl reload nginx

echo "[+] Finalizing WordPress install via WP-CLI"
SERVER_IP=$(hostname -I | awk '{print $1}')
SITE_URL="http://$SERVER_IP"

# Install WordPress as root with --allow-root flag
wp core install \
  --path="$WEB_ROOT" \
  --url="$SITE_URL" \
  --title="$SITE_TITLE" \
  --admin_user="$ADMIN_USERNAME" \
  --admin_password="$ADMIN_PASSWORD" \
  --admin_email="$ADMIN_EMAIL" \
  --skip-email \
  --allow-root

# Fix ownership again after installation
chown -R www-data:www-data "$WEB_ROOT"

echo "[+] Creating limited sudo user: $SUDO_USER"
if ! id "$SUDO_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$SUDO_USER"
  usermod -aG sudo "$SUDO_USER"
  echo "$SUDO_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$SUDO_USER
  chmod 0440 /etc/sudoers.d/$SUDO_USER
fi

echo "[+] WordPress installation completed successfully!"
echo "==========================================="
echo "Admin Username: $ADMIN_USERNAME"
echo "Admin Email: $ADMIN_EMAIL"
echo "WordPress URL: $SITE_URL"
echo "WordPress Admin: $SITE_URL/wp-admin"
echo "==========================================="
echo "Installation log: $LOG_FILE"