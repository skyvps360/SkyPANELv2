#!/bin/bash

# Docker Installation on Ubuntu 24.04 LTS
#
# <UDF name="sudo_user" label="Limited sudo user for Docker" example="dockeruser" default="dockeruser" />

set -euo pipefail
LOG_FILE="/root/docker-stackscript.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "[+] Starting Docker Installation StackScript (Ubuntu 24.04)"

# Use UDF variables
SUDO_USER=${SUDO_USER:-dockeruser}

export DEBIAN_FRONTEND=noninteractive

echo "[+] Updating system packages"
apt-get update -y
apt-get upgrade -y

echo "[+] Installing prerequisites"
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    apt-transport-https \
    software-properties-common

echo "[+] Adding Docker's official GPG key"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "[+] Setting up Docker repository"
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "[+] Installing Docker Engine"
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "[+] Starting and enabling Docker service"
systemctl start docker
systemctl enable docker

echo "[+] Verifying Docker installation"
docker --version
docker compose version

echo "[+] Configuring Docker daemon"
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

systemctl restart docker

echo "[+] Creating sudo user: $SUDO_USER"
if ! id "$SUDO_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$SUDO_USER"
  usermod -aG sudo "$SUDO_USER"
  usermod -aG docker "$SUDO_USER"
  echo "$SUDO_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$SUDO_USER
  chmod 0440 /etc/sudoers.d/$SUDO_USER
  echo "[+] User $SUDO_USER created and added to docker group"
else
  usermod -aG docker "$SUDO_USER"
  echo "[+] User $SUDO_USER added to docker group"
fi

echo "[+] Creating helpful Docker aliases"
cat >> /home/$SUDO_USER/.bashrc <<'EOF'

# Docker aliases
alias dps='docker ps'
alias dpsa='docker ps -a'
alias di='docker images'
alias dex='docker exec -it'
alias dl='docker logs'
alias dlf='docker logs -f'
alias dstop='docker stop $(docker ps -q)'
alias drm='docker rm $(docker ps -aq)'
alias drmi='docker rmi $(docker images -q)'
alias dprune='docker system prune -af'

# Docker Compose aliases
alias dc='docker compose'
alias dcup='docker compose up -d'
alias dcdown='docker compose down'
alias dclogs='docker compose logs -f'
alias dcps='docker compose ps'

EOF

chown $SUDO_USER:$SUDO_USER /home/$SUDO_USER/.bashrc

echo "[+] Docker installation completed successfully!"
echo "==========================================="
echo "Docker Version: $(docker --version)"
echo "Docker Compose Version: $(docker compose version)"
echo ""
echo "User created: $SUDO_USER (added to docker group)"
echo ""
echo "Installation log: $LOG_FILE"
echo "==========================================="