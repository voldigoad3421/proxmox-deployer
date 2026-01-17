#!/bin/bash
# prepare-netboot.sh - Prepare netboot assets from Proxmox auto-install ISO
# This script extracts kernel/initrd and embeds the ISO for PXE booting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 <input-iso> <profile-name> [output-dir]"
    echo ""
    echo "Arguments:"
    echo "  input-iso     Path to Proxmox auto-install ISO"
    echo "  profile-name  Name for this profile (used in filenames)"
    echo "  output-dir    Output directory (default: ./netboot-output)"
    echo ""
    echo "Example:"
    echo "  $0 proxmox-trinity-autoinstall.iso trinity ./netboot"
    exit 1
}

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check arguments
if [ $# -lt 2 ]; then
    usage
fi

INPUT_ISO="$1"
PROFILE_NAME="$2"
OUTPUT_DIR="${3:-./netboot-output}"

# Validate input
if [ ! -f "$INPUT_ISO" ]; then
    error "Input ISO not found: $INPUT_ISO"
fi

# Check dependencies
for cmd in mount umount cpio zstd; do
    if ! command -v $cmd &> /dev/null; then
        error "Required command not found: $cmd"
    fi
done

# Create output directories
mkdir -p "$OUTPUT_DIR/proxmox"
mkdir -p "$OUTPUT_DIR/ipxe"

# Create temporary mount point
MOUNT_POINT=$(mktemp -d)
WORK_DIR=$(mktemp -d)

cleanup() {
    log "Cleaning up..."
    sudo umount "$MOUNT_POINT" 2>/dev/null || true
    rm -rf "$MOUNT_POINT" "$WORK_DIR"
}
trap cleanup EXIT

# Mount ISO
log "Mounting ISO: $INPUT_ISO"
sudo mount -o loop,ro "$INPUT_ISO" "$MOUNT_POINT"

# Extract kernel (only once, same for all profiles)
if [ ! -f "$OUTPUT_DIR/proxmox/vmlinuz" ]; then
    log "Extracting kernel..."
    cp "$MOUNT_POINT/boot/linux26" "$OUTPUT_DIR/proxmox/vmlinuz"
fi

# Extract and modify initrd
log "Extracting initrd..."
cp "$MOUNT_POINT/boot/initrd.img" "$WORK_DIR/initrd.img.zst"

log "Decompressing initrd (this may take a while)..."
cd "$WORK_DIR"
zstd -d initrd.img.zst -o initrd.cpio

mkdir -p initrd-contents
cd initrd-contents
cpio -idv < ../initrd.cpio 2>/dev/null

log "Embedding ISO into initrd..."
cp "$INPUT_ISO" proxmox.iso

log "Repacking initrd..."
find . | cpio --quiet -o -H newc > ../new-initrd.cpio
zstd -5 ../new-initrd.cpio -o "$OUTPUT_DIR/proxmox/${PROFILE_NAME}-initrd.img"

cd "$OUTPUT_DIR"

# Get file sizes
INITRD_SIZE=$(du -h "proxmox/${PROFILE_NAME}-initrd.img" | cut -f1)
log "Created initrd: proxmox/${PROFILE_NAME}-initrd.img ($INITRD_SIZE)"

# Update/create iPXE menu if it doesn't exist
if [ ! -f "ipxe/menu.ipxe" ]; then
    log "Creating iPXE menu..."
    cat > "ipxe/menu.ipxe" << 'EOF'
#!ipxe
# Proxmox Deployer - iPXE Boot Menu
# Auto-generated

dhcp
set menu-timeout 30000
set base-url http://${next-server}/netboot

:start
menu Proxmox Deployer - Select Installation Profile
EOF
fi

# Check if profile already in menu
if ! grep -q "item ${PROFILE_NAME} " "ipxe/menu.ipxe"; then
    # Add item before the shell option (or at end if no shell option)
    if grep -q "item shell" "ipxe/menu.ipxe"; then
        sed -i "/item shell/i item ${PROFILE_NAME} Install ${PROFILE_NAME}" "ipxe/menu.ipxe"
    else
        echo "item ${PROFILE_NAME} Install ${PROFILE_NAME}" >> "ipxe/menu.ipxe"
    fi

    # Add boot target
    cat >> "ipxe/menu.ipxe" << EOF

:${PROFILE_NAME}
echo Booting ${PROFILE_NAME}...
kernel \${base-url}/proxmox/vmlinuz ro quiet ramdisk_size=16777216
initrd \${base-url}/proxmox/${PROFILE_NAME}-initrd.img
boot
EOF
fi

log "Done! Netboot assets created in: $OUTPUT_DIR"
echo ""
echo "Files created:"
echo "  - $OUTPUT_DIR/proxmox/vmlinuz (kernel)"
echo "  - $OUTPUT_DIR/proxmox/${PROFILE_NAME}-initrd.img (initrd with embedded ISO)"
echo "  - $OUTPUT_DIR/ipxe/menu.ipxe (iPXE boot menu)"
echo ""
echo "To serve these files, host $OUTPUT_DIR via HTTP on your network."
