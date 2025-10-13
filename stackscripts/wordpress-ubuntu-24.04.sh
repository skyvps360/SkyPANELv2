#!/bin/bash

# ContainerStacks: WordPress on Ubuntu 24.04 LTS
#
# <UDF name="admin_username" label="WordPress admin username" example="admin" />
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

# Derive variables from UDFs (UDFs are exposed as uppercase environment variables)
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
systemctl enable php8.3-fpm || true
systemctl start mysql
systemctl start php8.3-fpm || true
systemctl start nginx

echo "[+] Securing MySQL and creating database/user"
mysql -u root <<SQL
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
wp core download --quiet
cp wp-config-sample.php wp-config.php
sed -i "s/database_name_here/$DB_NAME/g" wp-config.php
sed -i "s/username_here/$DB_USER/g" wp-config.php
sed -i "s/password_here/$DB_PASSWORD/g" wp-config.php

# Generate salts
curl -s https://api.wordpress.org/secret-key/1.1/salt/ >> wp-config.php

chown -R www-data:www-data "$WEB_ROOT"
find "$WEB_ROOT" -type d -exec chmod 755 {} \;
find "$WEB_ROOT" -type f -exec chmod 644 {} \;

echo "[+] Configuring Nginx server block"
cat >/etc/nginx/sites-available/wordpress <<NGINX
server {
    listen 80 default_server;
    server_name _;
    root $WEB_ROOT;

    index index.php index.html index.htm;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
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
SITE_URL=${SITE_URL:-"http://$SERVER_IP"}
sudo -u www-data wp core install --path="$WEB_ROOT" --url="$SITE_URL" --title="$SITE_TITLE" --admin_user="$ADMIN_USERNAME" --admin_password="$ADMIN_PASSWORD" --admin_email="$ADMIN_EMAIL" --skip-email

echo "[+] Creating limited sudo user: $SUDO_USER"
if ! id "$SUDO_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$SUDO_USER"
  usermod -aG sudo "$SUDO_USER"
fi

echo "[+] WordPress installation completed"
echo "Admin: $ADMIN_USERNAME | Email: $ADMIN_EMAIL"
echo "URL: $SITE_URL"