# Netboot / iPXE Setup Guide

This guide explains how to set up network booting for Proxmox automated installation.

## Overview

Network booting allows you to install Proxmox on bare-metal servers without USB drives. The process works as follows:

1. Server boots via PXE/iPXE
2. iPXE loads kernel and initrd from HTTP server
3. Initrd contains the full Proxmox ISO with embedded answer.toml
4. Installation proceeds automatically

## Requirements

- DHCP server (for PXE boot)
- TFTP server (for initial iPXE chainloading)
- HTTP server (for serving kernel/initrd)
- Network connectivity to target servers

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Target Server  │────▶│   DHCP/TFTP     │────▶│   HTTP Server   │
│  (PXE Boot)     │     │   (dnsmasq)     │     │ (nginx/GitHub)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ 1. PXE Request        │                       │
        │◀──────────────────────│                       │
        │ 2. iPXE Binary        │                       │
        │──────────────────────▶│                       │
        │ 3. iPXE Script URL    │                       │
        │◀──────────────────────│                       │
        │                       │ 4. Fetch menu.ipxe    │
        │───────────────────────────────────────────────▶
        │                       │ 5. Fetch vmlinuz      │
        │◀───────────────────────────────────────────────
        │                       │ 6. Fetch initrd       │
        │◀───────────────────────────────────────────────
        │                       │                       │
        └── 7. Boot & Install ──┘                       │
```

## Setup Options

### Option 1: Full Local Setup (Recommended)

Host everything on your local network for maximum speed and reliability.

#### 1. Install dnsmasq

```bash
# Debian/Ubuntu
sudo apt install dnsmasq

# On your UDM Pro or router, you may need to configure DHCP options instead
```

#### 2. Configure dnsmasq

Create `/etc/dnsmasq.d/pxe-proxmox.conf`:

```conf
# Enable TFTP
enable-tftp
tftp-root=/var/lib/tftpboot

# PXE boot configuration
# UEFI clients
dhcp-match=set:efi-x86_64,option:client-arch,7
dhcp-match=set:efi-x86_64,option:client-arch,9
dhcp-boot=tag:efi-x86_64,ipxe.efi

# BIOS clients
dhcp-boot=tag:!efi-x86_64,undionly.kpxe

# Chainload to iPXE script
dhcp-match=set:ipxe,175
dhcp-boot=tag:ipxe,http://192.168.1.10/netboot/ipxe/menu.ipxe

# Network settings (adjust for your ZION VLAN)
dhcp-range=172.20.0.100,172.20.0.199,255.255.255.0,12h
dhcp-option=option:router,172.20.0.1
dhcp-option=option:dns-server,172.20.0.1
```

#### 3. Download iPXE binaries

```bash
sudo mkdir -p /var/lib/tftpboot
cd /var/lib/tftpboot

# UEFI
wget https://boot.ipxe.org/ipxe.efi

# BIOS
wget https://boot.ipxe.org/undionly.kpxe
```

#### 4. Set up HTTP server

```bash
# Using nginx
sudo apt install nginx

# Create netboot directory
sudo mkdir -p /var/www/html/netboot/proxmox
sudo mkdir -p /var/www/html/netboot/ipxe

# Copy files from GitHub Actions artifacts or local build
sudo cp vmlinuz /var/www/html/netboot/proxmox/
sudo cp *-initrd.img /var/www/html/netboot/proxmox/
sudo cp menu.ipxe /var/www/html/netboot/ipxe/
```

### Option 2: Hybrid Setup (GitHub Pages + Local TFTP)

Use GitHub Pages for hosting static files, with local TFTP for initial boot.

**Limitation**: GitHub Pages has a 100MB file limit, so initrd files (which can be 1-2GB) must be hosted elsewhere.

```conf
# dnsmasq config for hybrid setup
dhcp-match=set:ipxe,175
dhcp-boot=tag:ipxe,https://YOUR_USERNAME.github.io/proxmox-deployer/netboot/ipxe/menu.ipxe
```

For initrd files, use:
- GitHub Releases (up to 2GB per file)
- Self-hosted HTTP server
- Cloud storage (S3, GCS) with public read access

### Option 3: iPXE USB Stick

If your network doesn't support DHCP-based PXE, create a bootable iPXE USB.

1. Download iPXE ISO: https://boot.ipxe.org/ipxe.iso

2. Write to USB:
   ```bash
   sudo dd if=ipxe.iso of=/dev/sdX bs=4M status=progress
   ```

3. Boot from USB and enter these commands:
   ```
   iPXE> dhcp
   iPXE> chain http://YOUR_SERVER/netboot/ipxe/menu.ipxe
   ```

Or create a custom iPXE script embedded in the USB:

```bash
# Create custom iPXE script
cat > custom.ipxe << 'EOF'
#!ipxe
dhcp
chain http://YOUR_SERVER/netboot/ipxe/menu.ipxe || shell
EOF

# Build custom iPXE with embedded script
git clone https://github.com/ipxe/ipxe.git
cd ipxe/src
make bin-x86_64-efi/ipxe.efi EMBED=../../custom.ipxe
```

## File Structure

After building netboot assets, you'll have:

```
netboot/
├── proxmox/
│   ├── vmlinuz              # Kernel (same for all profiles)
│   ├── trinity-initrd.img   # Initrd with embedded ISO for trinity
│   ├── neo-initrd.img       # Initrd with embedded ISO for neo
│   └── ...
└── ipxe/
    └── menu.ipxe            # Boot menu with all profiles
```

## Building Netboot Assets

### Via GitHub Actions

1. Go to Actions → "Build Proxmox Auto-Install ISOs"
2. Click "Run workflow"
3. Enable "Build netboot assets" checkbox
4. Run the workflow
5. Download the `netboot-assets` artifact

### Locally

```bash
# Build auto-install ISO first
proxmox-auto-install-assistant prepare-iso proxmox-ve_8.4-1.iso \
  --fetch-from iso \
  --answer-file answer.toml \
  --output proxmox-trinity-autoinstall.iso

# Then prepare netboot assets
./netboot/scripts/prepare-netboot.sh proxmox-trinity-autoinstall.iso trinity ./netboot-output
```

## Troubleshooting

### "No bootable device found"

- Ensure PXE/Network boot is enabled in BIOS/UEFI
- Check DHCP server is running and reachable
- Verify TFTP server is serving iPXE binaries

### iPXE shows "Could not chain"

- Check HTTP server is running
- Verify URL in dnsmasq config is correct
- Test URL directly: `curl http://server/netboot/ipxe/menu.ipxe`

### "Kernel panic" or boot hangs

- Ensure initrd was properly created with embedded ISO
- Check ramdisk_size parameter (should be at least 16777216)
- Verify kernel and initrd versions match

### Installation starts but answer.toml not found

- The ISO might not be properly embedded in initrd
- Rebuild the initrd using the prepare-netboot.sh script

## Security Considerations

1. **Network Segmentation**: Keep PXE boot network separate from production
2. **HTTPS**: Use HTTPS for serving boot files when possible
3. **Firewall**: Restrict TFTP/DHCP to specific VLANs
4. **Passwords**: Never commit plaintext passwords - use GitHub Secrets

## UDM Pro Specific Notes

If using a Ubiquiti UDM Pro:

1. DHCP options must be set via CLI or custom config
2. Consider running dnsmasq on a separate server in the ZION VLAN
3. The UDM Pro's built-in TFTP is limited

Example UDM Pro config (via SSH):

```bash
# SSH to UDM Pro
ssh root@192.168.1.1

# Configure DHCP options for a specific network
# This varies by UniFi OS version - consult Ubiquiti documentation
```

## References

- [iPXE Documentation](https://ipxe.org/docs)
- [Proxmox Automated Installation](https://pve.proxmox.com/wiki/Automated_Installation)
- [pve-iso-2-pxe Tool](https://github.com/morph027/pve-iso-2-pxe)
- [dnsmasq Manual](https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html)
