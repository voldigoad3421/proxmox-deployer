#!/bin/bash
# build-local.sh - Build Proxmox auto-install ISO locally
# Requires: proxmox-auto-install-assistant, xorriso

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

usage() {
    echo "Usage: $0 <base-iso> <profile-name> [options]"
    echo ""
    echo "Arguments:"
    echo "  base-iso      Path to Proxmox VE base ISO"
    echo "  profile-name  Name of profile (from profiles/*.json)"
    echo ""
    echo "Options:"
    echo "  --password    Root password (or set ROOT_PASSWORD env var)"
    echo "  --ssh-key     SSH public key (or set ROOT_SSH_KEY env var)"
    echo "  --output      Output directory (default: ./output)"
    echo "  --help        Show this help"
    echo ""
    echo "Example:"
    echo "  $0 proxmox-ve_8.4-1.iso trinity --password 'MySecretPass'"
    exit 1
}

# Parse arguments
BASE_ISO=""
PROFILE_NAME=""
OUTPUT_DIR="./output"

while [[ $# -gt 0 ]]; do
    case $1 in
        --password)
            ROOT_PASSWORD="$2"
            shift 2
            ;;
        --ssh-key)
            ROOT_SSH_KEY="$2"
            shift 2
            ;;
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            if [ -z "$BASE_ISO" ]; then
                BASE_ISO="$1"
            elif [ -z "$PROFILE_NAME" ]; then
                PROFILE_NAME="$1"
            fi
            shift
            ;;
    esac
done

# Validate
[ -z "$BASE_ISO" ] && error "Base ISO not specified"
[ -z "$PROFILE_NAME" ] && error "Profile name not specified"
[ ! -f "$BASE_ISO" ] && error "Base ISO not found: $BASE_ISO"

PROFILE_FILE="$PROJECT_ROOT/profiles/${PROFILE_NAME}.json"
[ ! -f "$PROFILE_FILE" ] && error "Profile not found: $PROFILE_FILE"

# Check for password
if [ -z "$ROOT_PASSWORD" ]; then
    read -sp "Enter root password: " ROOT_PASSWORD
    echo
fi
[ -z "$ROOT_PASSWORD" ] && error "Root password is required"

# Check for assistant
if ! command -v proxmox-auto-install-assistant &> /dev/null; then
    error "proxmox-auto-install-assistant not found. Install it or use Docker."
fi

# Read profile
log "Reading profile: $PROFILE_NAME"
FQDN=$(jq -r '.global.fqdn' "$PROFILE_FILE")
KEYBOARD=$(jq -r '.global.keyboard // "en-us"' "$PROFILE_FILE")
COUNTRY=$(jq -r '.global.country // "us"' "$PROFILE_FILE")
MAILTO=$(jq -r '.global.mailto // "root@localhost"' "$PROFILE_FILE")
TIMEZONE=$(jq -r '.global.timezone // "UTC"' "$PROFILE_FILE")

NET_SOURCE=$(jq -r '.network.source // "from-dhcp"' "$PROFILE_FILE")
NET_CIDR=$(jq -r '.network.cidr // ""' "$PROFILE_FILE")
NET_GW=$(jq -r '.network.gateway // ""' "$PROFILE_FILE")
NET_DNS=$(jq -r '.network.dns // ""' "$PROFILE_FILE")

FS=$(jq -r '.diskSetup.filesystem // "zfs"' "$PROFILE_FILE")
DISKS=$(jq -r '.diskSetup.diskList // ["sda"] | map("\"" + . + "\"") | join(", ")' "$PROFILE_FILE")
ZFS_RAID=$(jq -r '.diskSetup.zfs.raid // "raid1"' "$PROFILE_FILE")
ZFS_ASHIFT=$(jq -r '.diskSetup.zfs.ashift // 12' "$PROFILE_FILE")
ZFS_COMPRESS=$(jq -r '.diskSetup.zfs.compress // "lz4"' "$PROFILE_FILE")

# Create answer.toml
ANSWER_FILE=$(mktemp)
log "Generating answer.toml..."

cat > "$ANSWER_FILE" << EOF
# Proxmox Auto-Install Answer File
# Profile: ${PROFILE_NAME}
# Generated: $(date -Iseconds)

[global]
keyboard = "${KEYBOARD}"
country = "${COUNTRY}"
fqdn = "${FQDN}"
mailto = "${MAILTO}"
timezone = "${TIMEZONE}"
root-password = "${ROOT_PASSWORD}"
EOF

if [ -n "$ROOT_SSH_KEY" ]; then
    echo "root-ssh-keys = [\"${ROOT_SSH_KEY}\"]" >> "$ANSWER_FILE"
fi

cat >> "$ANSWER_FILE" << EOF
reboot-on-error = false

[network]
source = "${NET_SOURCE}"
EOF

if [ "$NET_SOURCE" = "from-answer" ]; then
    cat >> "$ANSWER_FILE" << EOF
cidr = "${NET_CIDR}"
gateway = "${NET_GW}"
dns = "${NET_DNS}"
EOF
fi

cat >> "$ANSWER_FILE" << EOF

[disk-setup]
filesystem = "${FS}"
disk-list = [${DISKS}]
EOF

if [ "$FS" = "zfs" ]; then
    cat >> "$ANSWER_FILE" << EOF

zfs.raid = "${ZFS_RAID}"
zfs.ashift = ${ZFS_ASHIFT}
zfs.compress = "${ZFS_COMPRESS}"
EOF
fi

log "Answer file contents:"
echo -e "${BLUE}"
cat "$ANSWER_FILE" | grep -v "root-password"
echo -e "${NC}"
echo "(root-password hidden)"

# Validate
log "Validating answer file..."
proxmox-auto-install-assistant validate-answer "$ANSWER_FILE"

# Build ISO
mkdir -p "$OUTPUT_DIR"
OUTPUT_ISO="$OUTPUT_DIR/proxmox-${PROFILE_NAME}-autoinstall.iso"

log "Building auto-install ISO..."
proxmox-auto-install-assistant prepare-iso "$BASE_ISO" \
    --fetch-from iso \
    --answer-file "$ANSWER_FILE" \
    --output "$OUTPUT_ISO"

# Cleanup
rm -f "$ANSWER_FILE"

log "Build complete!"
echo ""
echo "Output: $OUTPUT_ISO"
echo "Size: $(du -h "$OUTPUT_ISO" | cut -f1)"
echo ""
echo "To write to USB:"
echo "  sudo dd if=$OUTPUT_ISO of=/dev/sdX bs=4M status=progress"
