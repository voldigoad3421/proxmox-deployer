# Proxmox Deployer

Self-service Proxmox VE deployment platform with GitHub Actions ISO builder and iPXE netboot support.

[![Deploy Site](https://github.com/voldigoad3421/proxmox-deployer/actions/workflows/deploy-site.yml/badge.svg)](https://github.com/voldigoad3421/proxmox-deployer/actions/workflows/deploy-site.yml)
[![Build ISOs](https://github.com/voldigoad3421/proxmox-deployer/actions/workflows/build-proxmox-iso.yml/badge.svg)](https://github.com/voldigoad3421/proxmox-deployer/actions/workflows/build-proxmox-iso.yml)

## Quick Start

### 1. Fork & Configure

```bash
# Fork this repository, then clone
git clone https://github.com/voldigoad3421/proxmox-deployer.git
cd proxmox-deployer

# Update repository references
sed -i 's/voldigoad3421/your-github-username/g' README.md site/src/utils/storage.ts
```

### 2. Set Up GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Description | Required |
|--------|-------------|----------|
| `ROOT_PASSWORD` | Root password for Proxmox | Yes |
| `ROOT_SSH_KEY` | SSH public key (ed25519 or RSA) | Yes |

### 3. Create Node Profiles

**Option A: Web UI**
1. Enable GitHub Pages (Settings → Pages → Deploy from branch: `main`, folder: `/docs`)
2. Visit `https://voldigoad3421.github.io/proxmox-deployer/`
3. Create profiles using the form
4. Export and commit to `/profiles/`

**Option B: JSON Files**
Create JSON files in `/profiles/`:

```json
{
  "id": "my-node",
  "name": "my-node",
  "description": "My Proxmox Node",
  "global": {
    "keyboard": "en-us",
    "country": "us",
    "fqdn": "my-node.local",
    "mailto": "admin@local",
    "timezone": "America/New_York"
  },
  "network": {
    "source": "from-answer",
    "cidr": "192.168.1.100/24",
    "gateway": "192.168.1.1",
    "dns": "192.168.1.1"
  },
  "diskSetup": {
    "filesystem": "zfs",
    "diskList": ["sda", "sdb"],
    "zfs": {
      "raid": "raid1",
      "ashift": 12,
      "compress": "lz4"
    }
  }
}
```

### 4. Build ISOs

Go to **Actions → Build Proxmox Auto-Install ISOs → Run workflow**

Options:
- **Profiles**: Comma-separated list (leave empty for all)
- **ISO source**: URL or GitHub Release
- **Publish release**: Attach ISOs to a GitHub Release

### 5. Flash & Boot

```bash
# Download ISO from workflow artifacts or release
# Write to USB
sudo dd if=proxmox-my-node-autoinstall.iso of=/dev/sdX bs=4M status=progress

# Boot from USB - installation is fully automated!
```

---

## Features

- **Web UI** for configuring node profiles (React + TypeScript + Vite)
- **Zod validation** for answer.toml schema
- **GitHub Actions** workflow for building ISOs
- **Multiple ISO sources**: Direct URL download or GitHub Release assets
- **Netboot/iPXE** support for USB-less deployment
- **Caching** for faster repeated builds
- **GitHub Secrets** integration for secure password handling

## Repository Structure

```
proxmox-deployer/
├── site/                    # React frontend (GitHub Pages)
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── schemas/         # Zod validation schemas
│   │   ├── store/           # Zustand state management
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Helper functions
│   └── package.json
├── profiles/                # Node profile JSON files
│   ├── example-trinity.json
│   └── example-neo.json
├── answers/                 # Generated answer.toml files (gitignored)
├── netboot/                 # iPXE/netboot infrastructure
│   ├── ipxe/               # iPXE menu scripts
│   ├── scripts/            # Helper scripts
│   └── docs/               # Netboot documentation
├── scripts/                 # Local build scripts
├── .github/workflows/       # GitHub Actions
│   ├── build-proxmox-iso.yml
│   └── deploy-site.yml
├── Dockerfile              # Container for proxmox-auto-install-assistant
└── README.md
```

## Profile Schema

Profiles follow the Proxmox answer.toml schema. Full reference:

### Global Settings

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `keyboard` | string | Yes | Keyboard layout (en-us, de, fr, etc.) |
| `country` | string | Yes | ISO country code |
| `fqdn` | string | Yes | Fully qualified domain name |
| `mailto` | string | Yes | Admin email |
| `timezone` | string | Yes | Timezone (America/New_York, UTC, etc.) |
| `rebootOnError` | boolean | No | Reboot if installation fails |
| `rebootMode` | string | No | "reboot" or "power-off" |

### Network

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | string | Yes | "from-dhcp" or "from-answer" |
| `cidr` | string | If static | IP/CIDR (192.168.1.100/24) |
| `gateway` | string | If static | Gateway IP |
| `dns` | string | If static | DNS server IP |

### Disk Setup

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filesystem` | string | Yes | "zfs", "ext4", "xfs", or "btrfs" |
| `diskList` | array | No | Explicit disk list ["sda", "sdb"] |
| `filter` | object | No | UDEV filter for disk selection |

#### ZFS Options

| Field | Type | Description |
|-------|------|-------------|
| `zfs.raid` | string | raid0, raid1, raid10, raidz-1, raidz-2, raidz-3 |
| `zfs.ashift` | number | Sector size shift (9=512B, 12=4K, 13=8K) |
| `zfs.compress` | string | lz4, zstd, on, off |
| `zfs.checksum` | string | on, fletcher4, sha256 |
| `zfs.arcMax` | number | ARC max size in MiB |

## Netboot / iPXE

For USB-less deployment via network boot, see [netboot/docs/NETBOOT.md](netboot/docs/NETBOOT.md).

### Quick Overview

1. Build ISOs with netboot option enabled
2. Configure dnsmasq for PXE boot
3. Host kernel/initrd via HTTP
4. Boot target machine via PXE

### Limitations

- Proxmox does not officially support PXE boot
- Initrd files with embedded ISO are 1-2GB
- GitHub Pages has 100MB file limit (use Releases for large files)

## Local Development

### Frontend

```bash
cd site
npm install
npm run dev    # Start dev server at http://localhost:5173
npm run build  # Build for production
```

### Building ISOs Locally

```bash
# Install dependencies (Debian/Ubuntu)
sudo apt install xorriso wget jq

# Add Proxmox repo
wget -qO- "https://enterprise.proxmox.com/debian/proxmox-release-bookworm.gpg" | \
  sudo tee /etc/apt/trusted.gpg.d/proxmox-release-bookworm.gpg > /dev/null
echo "deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription" | \
  sudo tee /etc/apt/sources.list.d/pve.list
sudo apt update && sudo apt install proxmox-auto-install-assistant

# Build
./scripts/build-local.sh proxmox-ve_8.4-1.iso my-profile --password 'secret'
```

### Using Docker

```bash
# Build container
docker build -t pve-assistant .

# Run
docker run --rm -v $(pwd):/workspace pve-assistant \
  prepare-iso /workspace/proxmox-ve_8.4-1.iso \
  --fetch-from iso \
  --answer-file /workspace/answer.toml \
  --output /workspace/output.iso
```

## Security Notes

1. **Never commit passwords** - Use GitHub Secrets
2. **SSH keys** - Use ed25519 for better security
3. **Network segmentation** - Keep PXE boot isolated
4. **HTTPS** - Use HTTPS for fetching boot files when possible
5. **Review answer files** - Check generated TOML before building

### Password Handling

The workflow injects passwords from GitHub Secrets at build time:

```toml
# In generated answer.toml
root-password = "${{ secrets.ROOT_PASSWORD }}"
root-ssh-keys = ["${{ secrets.ROOT_SSH_KEY }}"]
```

These values never appear in committed files or logs.

## Workflow Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `profiles` | string | "" | Comma-separated profile names |
| `iso_source` | choice | url | "url" or "release" |
| `iso_url` | string | PVE 8.4 URL | Direct ISO download URL |
| `iso_checksum` | string | "" | SHA256 for verification |
| `release_tag` | string | "" | GitHub Release tag |
| `publish_release` | boolean | false | Publish ISOs to Release |
| `build_netboot` | boolean | false | Build iPXE assets |

## Troubleshooting

### "proxmox-auto-install-assistant not found"

The package only exists in Proxmox repositories. Options:
1. Use the provided Docker container
2. Build on a Debian system with Proxmox repos added
3. Build from source (see Dockerfile.assistant)

### "Answer file validation failed"

Check your profile JSON:
- FQDN must be valid (no underscores)
- CIDR must include netmask (/24)
- Disk list must use actual device names

### "ISO checksum mismatch"

Verify you're using the correct checksum from proxmox.com/downloads

### Build takes too long

- Enable ISO caching (already configured)
- Use GitHub Release assets for base ISO
- Consider self-hosted runners for better performance

## Requirements

- **Proxmox VE 8.2+** (for answer.toml support)
- **GitHub Actions** (ubuntu-latest runner)
- **Node.js 20+** (for frontend development)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Submit a pull request

## License

MIT License - See [LICENSE](LICENSE)

## References

- [Proxmox Automated Installation Wiki](https://pve.proxmox.com/wiki/Automated_Installation)
- [proxmox-auto-install-assistant](https://git.proxmox.com/git/pve-installer.git)
- [iPXE Documentation](https://ipxe.org/docs)
- [pve-iso-2-pxe](https://github.com/morph027/pve-iso-2-pxe)

---

Made with Proxmox Deployer
