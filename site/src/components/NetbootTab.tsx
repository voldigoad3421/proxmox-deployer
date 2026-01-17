import { Wifi, Copy, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useState } from 'react';

export function NetbootTab() {
  const { profiles, settings } = useStore();
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = `https://${settings.githubOwner}.github.io/${settings.githubRepo}`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const ipxeMenu = `#!ipxe
# Proxmox Deployer - iPXE Boot Menu
# Auto-generated for your node profiles

dhcp
set menu-timeout 30000
set submenu-timeout ${"{menu-timeout}"}
set base-url ${baseUrl}/netboot

:start
menu Proxmox Deployer - Select Installation Profile
${profiles.map((p, i) => `item --key ${i + 1} ${p.name.toLowerCase()} ${p.name} (${p.global.fqdn})`).join('\n')}
item --key 0 exit Exit to shell
choose --timeout \${menu-timeout} --default ${profiles[0]?.name.toLowerCase() || 'exit'} selected || goto exit
goto \${selected}

${profiles.map((p) => `
:${p.name.toLowerCase()}
echo Booting ${p.name} (${p.global.fqdn})...
kernel \${base-url}/proxmox/vmlinuz ro quiet ramdisk_size=16777216
initrd \${base-url}/proxmox/${p.name.toLowerCase()}-initrd.img
boot
`).join('')}

:exit
echo Exiting to iPXE shell...
shell
`;

  const dnsmasqConfig = `# dnsmasq iPXE configuration for Proxmox Deployer
# Add to /etc/dnsmasq.conf or /etc/dnsmasq.d/proxmox-deployer.conf

# Enable TFTP
enable-tftp
tftp-root=/var/lib/tftpboot

# DHCP range for PXE clients (adjust to your network)
dhcp-range=172.20.0.100,172.20.0.199,255.255.255.0,12h

# Set the boot filename based on client architecture
# For UEFI clients
dhcp-match=set:efi-x86_64,option:client-arch,7
dhcp-match=set:efi-x86_64,option:client-arch,9
dhcp-boot=tag:efi-x86_64,ipxe.efi

# For legacy BIOS clients
dhcp-boot=tag:!efi-x86_64,undionly.kpxe

# Chain to our iPXE script once iPXE is loaded
dhcp-match=set:ipxe,175
dhcp-boot=tag:ipxe,${baseUrl}/netboot/ipxe/menu.ipxe

# Router and DNS
dhcp-option=option:router,172.20.0.1
dhcp-option=option:dns-server,172.20.0.1
`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-pve-accent/20 rounded-lg">
            <Wifi className="w-8 h-8 text-pve-accent" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white mb-2">Netboot / iPXE Configuration</h2>
            <p className="text-gray-400">
              Boot Proxmox installer over the network without USB drives. This requires preparing a
              custom initrd that embeds the installation ISO.
            </p>
          </div>
        </div>
      </div>

      {/* Important Note */}
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-yellow-200 mb-1">PXE Boot Limitations</h3>
            <p className="text-sm text-yellow-200/80">
              Proxmox does not officially support PXE boot for the installer. The solution below
              embeds the full ISO into the initrd, which can result in large initrd files (1-2GB).
              This works but requires adequate network bandwidth and TFTP/HTTP server capacity.
            </p>
          </div>
        </div>
      </div>

      {/* iPXE Menu */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Generated iPXE Menu</h3>
          <button
            onClick={() => copyToClipboard(ipxeMenu, 'ipxe')}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            {copied === 'ipxe' ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="code-block text-xs overflow-x-auto max-h-80">{ipxeMenu}</pre>
        <p className="text-sm text-gray-400 mt-3">
          This menu is dynamically generated from your saved profiles. It will be served from:{' '}
          <code className="bg-black/30 px-1 rounded">{baseUrl}/netboot/ipxe/menu.ipxe</code>
        </p>
      </div>

      {/* dnsmasq Config */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">dnsmasq Configuration</h3>
          <button
            onClick={() => copyToClipboard(dnsmasqConfig, 'dnsmasq')}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            {copied === 'dnsmasq' ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="code-block text-xs overflow-x-auto max-h-80">{dnsmasqConfig}</pre>
        <p className="text-sm text-gray-400 mt-3">
          Example dnsmasq configuration for your ZION VLAN (172.20.0.0/24). Adjust IP ranges as
          needed.
        </p>
      </div>

      {/* Setup Steps */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Setup Instructions</h3>
        <div className="space-y-4">
          <Step number={1} title="Prepare Netboot Assets">
            <p>
              Run the GitHub Actions workflow with the &quot;Build Netboot&quot; option enabled. This will:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Extract kernel (vmlinuz) from Proxmox ISO</li>
              <li>Create custom initrd with embedded ISO for each profile</li>
              <li>Generate iPXE menu script</li>
            </ul>
          </Step>

          <Step number={2} title="Configure DHCP/TFTP Server">
            <p>
              Set up dnsmasq (or similar) on your network. You&apos;ll need:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>
                TFTP server hosting iPXE binaries (
                <a
                  href="https://boot.ipxe.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pve-accent hover:underline"
                >
                  boot.ipxe.org
                </a>
                )
              </li>
              <li>DHCP configured to chainload iPXE to your menu script</li>
              <li>HTTP server (GitHub Pages works) hosting vmlinuz and initrd files</li>
            </ul>
          </Step>

          <Step number={3} title="Boot Target Machine">
            <p>
              Enable PXE boot in BIOS/UEFI on target machine, then boot. The iPXE menu will appear
              with your configured profiles.
            </p>
          </Step>

          <Step number={4} title="Alternative: iPXE USB">
            <p>
              If your network doesn&apos;t support DHCP-based PXE, create an iPXE USB stick that chainloads
              to your menu:
            </p>
            <pre className="code-block text-xs mt-2">
{`#!ipxe
dhcp
chain ${baseUrl}/netboot/ipxe/menu.ipxe`}
            </pre>
          </Step>
        </div>
      </div>

      {/* GitHub Pages Hosting */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Hosting on GitHub Pages</h3>
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            GitHub Pages has a <strong>100MB file size limit</strong>, which means hosting the full
            initrd (with embedded ISO) directly on GitHub Pages is not feasible.
          </p>
          <p>Options:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li>
              <strong>GitHub Releases:</strong> Host large initrd files as Release assets (up to 2GB)
            </li>
            <li>
              <strong>Self-hosted HTTP:</strong> Run nginx/caddy on your network to serve large files
            </li>
            <li>
              <strong>Cloud storage:</strong> Use S3, GCS, or similar with public read access
            </li>
          </ul>
          <p className="mt-4">
            The iPXE menu and small assets (kernel, scripts) can remain on GitHub Pages.
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Useful Resources</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="https://ipxe.org/howto/chainloading"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-pve-accent" />
            <span>iPXE Chainloading Guide</span>
          </a>
          <a
            href="https://pve.proxmox.com/wiki/Automated_Installation"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-pve-accent" />
            <span>Proxmox Auto-Install Docs</span>
          </a>
          <a
            href="https://github.com/morph027/pve-iso-2-pxe"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-pve-accent" />
            <span>pve-iso-2-pxe Tool</span>
          </a>
          <a
            href="https://boot.ipxe.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-pve-accent" />
            <span>iPXE Boot Images</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-pve-accent/20 text-pve-accent rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <h4 className="font-medium text-white mb-1">{title}</h4>
        <div className="text-sm text-gray-400">{children}</div>
      </div>
    </div>
  );
}
