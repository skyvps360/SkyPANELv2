#!/bin/bash

# ContainerStacks: EasyPanel on Ubuntu 22.04 LTS
#
# <UDF name="sudo_user" label="Limited sudo user (no caps/special chars)" default="easypanel" />

set -euo pipefail
LOG_FILE="/root/stackscript.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "[+] Starting EasyPanel StackScript (Ubuntu 22.04)"

SUDO_USER=${SUDO_USER:-easypanel}

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "[+] Installing prerequisites"
apt-get install -y curl ca-certificates gnupg lsb-release

echo "[+] Installing Docker (required by EasyPanel)"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \\n+  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable docker
systemctl start docker

echo "[+] Installing EasyPanel"
curl -sSL https://get.easypanel.io | sh

echo "[+] Creating limited sudo user: $SUDO_USER"
if ! id "$SUDO_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$SUDO_USER"
  usermod -aG sudo "$SUDO_USER"
fi
usermod -aG docker "$SUDO_USER"

echo "[+] EasyPanel installation completed"