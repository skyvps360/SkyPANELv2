#!/bin/bash

# ContainerStacks: Docker on Ubuntu 24.04 LTS
#
# <UDF name="sudo_user" label="Limited sudo user (no caps/special chars)" default="dockeruser" />
# <UDF name="ssh_key" label="SSH public key for sudo user (optional)" default="" />

set -euo pipefail
LOG_FILE="/root/stackscript.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "[+] Starting Docker StackScript (Ubuntu 24.04)"

SUDO_USER=${SUDO_USER:-dockeruser}
SSH_KEY=${SSH_KEY:-}

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "[+] Installing base packages"
apt-get install -y ca-certificates curl gnupg lsb-release ufw

echo "[+] Setting up Docker repository"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \\n+  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "[+] Creating limited sudo user: $SUDO_USER"
if ! id "$SUDO_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$SUDO_USER"
  usermod -aG sudo "$SUDO_USER"
fi
usermod -aG docker "$SUDO_USER"

if [ -n "$SSH_KEY" ]; then
  echo "[+] Installing SSH key for $SUDO_USER"
  HOME_DIR=$(getent passwd "$SUDO_USER" | cut -d: -f6)
  mkdir -p "$HOME_DIR/.ssh"
  echo "$SSH_KEY" >> "$HOME_DIR/.ssh/authorized_keys"
  chmod 700 "$HOME_DIR/.ssh"
  chmod 600 "$HOME_DIR/.ssh/authorized_keys"
  chown -R "$SUDO_USER":"$SUDO_USER" "$HOME_DIR/.ssh"
fi

echo "[+] Configuring basic firewall (UFW)"
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
yes | ufw enable || true

echo "[+] Docker installation completed"