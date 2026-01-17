# Dockerfile for proxmox-auto-install-assistant
# Use this as a fallback when the native package installation fails

FROM debian:bookworm-slim

LABEL maintainer="Proxmox Deployer"
LABEL description="Container with proxmox-auto-install-assistant for building auto-install ISOs"

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    xorriso \
    mkisofs \
    squashfs-tools \
    fakeroot \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Add Proxmox repository and install assistant
RUN wget -qO /etc/apt/trusted.gpg.d/proxmox-release-bookworm.gpg \
    https://enterprise.proxmox.com/debian/proxmox-release-bookworm.gpg \
    && echo "deb [arch=amd64] http://download.proxmox.com/debian/pve bookworm pve-no-subscription" \
    > /etc/apt/sources.list.d/pve.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends proxmox-auto-install-assistant \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

ENTRYPOINT ["proxmox-auto-install-assistant"]
CMD ["--help"]
