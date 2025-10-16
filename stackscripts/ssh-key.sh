#!/bin/bash

# Universal SSH Key Installation - Works on ALL Linux Distributions
#
# <UDF name="ssh_user" label="Username for SSH access" example="admin" default="admin" />
# <UDF name="disable_root_ssh" label="Disable root SSH login?" oneOf="yes,no" default="yes" />
# <UDF name="disable_password_auth" label="Disable password authentication?" oneOf="yes,no" default="yes" />

set -euo pipefail
LOG_FILE="/root/ssh-key-stackscript.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "[+] Starting Universal SSH Key Installation StackScript"

# Use UDF variables
SSH_PUBLIC_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDXy5BVJjRodaCcagL+sJ1ssoiknNptzfBl9stZKgRia8a8OlfREdomFiLYb0mfxJcaOqkCMUJFVMTqg2piLTCMyzjbvZb2zYSm+lQDZ6OesWZzmBv69VQRshWSR0PbR4Y0XiJkEdClRan4EW/c+9MM0ltjgvQFTE/sbbQoKx7R+iWPnx8uJPDIvCIHsXeoPRByAHih4ckMIjh8F+yhNjoKMwr8JPhDMV0Zfj9rRi5EQNAcjz5AllL+zDSVndo+fHOUdilB5g8L/er2qSHOSsVDCQMNUKrS4JUXUdLDUWIlGvSGbNfv9YaVVx19M8KJCk07euo6+Yr4hh1n+50BR2jRdzgetlytr5gjJAMRRB2S9p+mR3rBsTREIAH8egqyNl7P/UOh+eA9/rTPSK+s5SmUUHcbNtfHa7ZVWYYgIzcZv0x2rZp+YhyChYvo8OAybHuaYprHIB9aE3R9SPxkBlfXmVvJ0euswdg1hL46Nu9XyUImNDIDJh9fZK8SbsrdREdWPzbGq1ky3Dk9R8Tfy81ZVthWO7v3/OLXBXL96yc/1yS7+wj1n7idsiFwRoqePFPX+aNpQt1xbj7lw5tlkZkatSUQ+TQewf+meDR9KbnQ4ouZxgEkygrVX9DDRwe+pJ5xJPcCFmkMIWuT+xIAM+GzTlNWMkZA9T+4VG2J5tUFxQ=="
SSH_USER=${SSH_USER:-admin}
DISABLE_ROOT_SSH=${DISABLE_ROOT_SSH:-yes}
DISABLE_PASSWORD_AUTH=${DISABLE_PASSWORD_AUTH:-yes}

# Validate SSH key is provided
if [ -z "$SSH_PUBLIC_KEY" ]; then
  echo "[ERROR] SSH public key is missing!"
  exit 1
fi

echo "[+] Detected OS Information:"
if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo "    Distribution: $NAME"
  echo "    Version: $VERSION"
else
  echo "    Distribution: Unknown (but continuing anyway)"
fi

echo "[+] Creating user: $SSH_USER"
# Create user if doesn't exist (works on all distros)
if ! id "$SSH_USER" >/dev/null 2>&1; then
  # Try useradd first (most common)
  if command -v useradd >/dev/null 2>&1; then
    useradd -m -s /bin/bash "$SSH_USER" 2>/dev/null || useradd -m "$SSH_USER"
  # Fallback to adduser (Debian/Ubuntu)
  elif command -v adduser >/dev/null 2>&1; then
    adduser --disabled-password --gecos "" "$SSH_USER"
  else
    echo "[ERROR] Cannot create user - no useradd or adduser command found"
    exit 1
  fi
  echo "[+] User $SSH_USER created successfully"
else
  echo "[+] User $SSH_USER already exists"
fi

echo "[+] Adding $SSH_USER to sudo/wheel group"
# Detect and add to appropriate sudo group
if getent group sudo >/dev/null 2>&1; then
  usermod -aG sudo "$SSH_USER"
  echo "[+] Added to sudo group"
elif getent group wheel >/dev/null 2>&1; then
  usermod -aG wheel "$SSH_USER"
  echo "[+] Added to wheel group"
else
  echo "[WARNING] No sudo or wheel group found - user may not have sudo access"
fi

echo "[+] Configuring passwordless sudo for $SSH_USER"
# Create sudoers file (works on all distros with sudo)
if [ -d /etc/sudoers.d ]; then
  echo "$SSH_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$SSH_USER
  chmod 0440 /etc/sudoers.d/$SSH_USER
  echo "[+] Passwordless sudo configured"
fi

echo "[+] Installing SSH public key for $SSH_USER"
USER_HOME=$(eval echo ~$SSH_USER)
SSH_DIR="$USER_HOME/.ssh"
AUTHORIZED_KEYS="$SSH_DIR/authorized_keys"

# Create .ssh directory
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

# Add SSH public key
echo "$SSH_PUBLIC_KEY" > "$AUTHORIZED_KEYS"
chmod 600 "$AUTHORIZED_KEYS"

# Set ownership
chown -R "$SSH_USER":"$SSH_USER" "$SSH_DIR"

echo "[+] SSH key installed for user: $SSH_USER"

# Also add key to root if disabling root SSH is set to no
if [ "$DISABLE_ROOT_SSH" = "no" ]; then
  echo "[+] Installing SSH public key for root user"
  ROOT_SSH_DIR="/root/.ssh"
  ROOT_AUTHORIZED_KEYS="$ROOT_SSH_DIR/authorized_keys"
  
  mkdir -p "$ROOT_SSH_DIR"
  chmod 700 "$ROOT_SSH_DIR"
  
  # Append key (don't overwrite existing keys)
  if [ -f "$ROOT_AUTHORIZED_KEYS" ]; then
    echo "$SSH_PUBLIC_KEY" >> "$ROOT_AUTHORIZED_KEYS"
  else
    echo "$SSH_PUBLIC_KEY" > "$ROOT_AUTHORIZED_KEYS"
  fi
  
  chmod 600 "$ROOT_AUTHORIZED_KEYS"
  echo "[+] SSH key installed for root user"
fi

echo "[+] Configuring SSH daemon"
SSHD_CONFIG="/etc/ssh/sshd_config"

# Backup original config
cp "$SSHD_CONFIG" "${SSHD_CONFIG}.backup.$(date +%Y%m%d-%H%M%S)"

# Function to update or add SSH config option
update_ssh_config() {
  local key=$1
  local value=$2
  
  if grep -q "^#*${key}" "$SSHD_CONFIG"; then
    # Option exists, update it
    sed -i "s|^#*${key}.*|${key} ${value}|" "$SSHD_CONFIG"
  else
    # Option doesn't exist, add it
    echo "${key} ${value}" >> "$SSHD_CONFIG"
  fi
}

# Disable root SSH login if requested
if [ "$DISABLE_ROOT_SSH" = "yes" ]; then
  echo "[+] Disabling root SSH login"
  update_ssh_config "PermitRootLogin" "no"
else
  echo "[+] Keeping root SSH login enabled"
  update_ssh_config "PermitRootLogin" "yes"
fi

# Disable password authentication if requested
if [ "$DISABLE_PASSWORD_AUTH" = "yes" ]; then
  echo "[+] Disabling password authentication (SSH key only)"
  update_ssh_config "PasswordAuthentication" "no"
  update_ssh_config "ChallengeResponseAuthentication" "no"
  update_ssh_config "UsePAM" "yes"
else
  echo "[+] Keeping password authentication enabled"
  update_ssh_config "PasswordAuthentication" "yes"
fi

# Ensure PubkeyAuthentication is enabled
update_ssh_config "PubkeyAuthentication" "yes"

echo "[+] Restarting SSH service"
# Detect and restart SSH service (works across distros)
if command -v systemctl >/dev/null 2>&1; then
  # SystemD systems
  if systemctl list-unit-files | grep -q sshd.service; then
    systemctl restart sshd
    echo "[+] SSH service (sshd) restarted"
  elif systemctl list-unit-files | grep -q ssh.service; then
    systemctl restart ssh
    echo "[+] SSH service (ssh) restarted"
  fi
elif command -v service >/dev/null 2>&1; then
  # SysV Init systems
  service sshd restart 2>/dev/null || service ssh restart
  echo "[+] SSH service restarted"
else
  # Fallback
  /etc/init.d/sshd restart 2>/dev/null || /etc/init.d/ssh restart
  echo "[+] SSH service restarted"
fi

echo "[+] SSH Key installation completed successfully!"
echo "==========================================="
echo "SSH User: $SSH_USER"
echo "Root SSH: $([ "$DISABLE_ROOT_SSH" = "yes" ] && echo "Disabled" || echo "Enabled")"
echo "Password Auth: $([ "$DISABLE_PASSWORD_AUTH" = "yes" ] && echo "Disabled" || echo "Enabled")"
echo ""
echo "You can now connect via SSH using:"
echo "  ssh $SSH_USER@YOUR_SERVER_IP"
echo ""
echo "Installation log: $LOG_FILE"
echo "==========================================="