import { Settings, Save, RotateCcw, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useState } from 'react';
import { GitHubConnect } from './GitHubConnect';

export function SettingsTab() {
  const { settings, updateSettings } = useStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setLocalSettings({
      githubOwner: 'YOUR_USERNAME',
      githubRepo: 'proxmox-deployer',
      defaultIsoUrl: 'https://enterprise.proxmox.com/iso/proxmox-ve_8.4-1.iso',
      defaultIsoChecksum: '',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-pve-accent/20 rounded-lg">
            <Settings className="w-8 h-8 text-pve-accent" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Settings</h2>
            <p className="text-gray-400">Configure your Proxmox Deployer instance</p>
          </div>
        </div>
      </div>

      {/* GitHub Connection */}
      <GitHubConnect />

      {/* GitHub Settings */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">GitHub Repository</h3>
        <div className="space-y-4">
          <div>
            <label className="form-label">GitHub Username / Organization</label>
            <input
              type="text"
              value={localSettings.githubOwner}
              onChange={(e) => setLocalSettings((s) => ({ ...s, githubOwner: e.target.value }))}
              placeholder="your-username"
              className="form-input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for generating GitHub links and Actions URLs
            </p>
          </div>
          <div>
            <label className="form-label">Repository Name</label>
            <input
              type="text"
              value={localSettings.githubRepo}
              onChange={(e) => setLocalSettings((s) => ({ ...s, githubRepo: e.target.value }))}
              placeholder="proxmox-deployer"
              className="form-input"
            />
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-gray-400">
              <strong className="text-white">Your repo URL:</strong>{' '}
              <a
                href={`https://github.com/${localSettings.githubOwner}/${localSettings.githubRepo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pve-accent hover:underline inline-flex items-center gap-1"
              >
                github.com/{localSettings.githubOwner}/{localSettings.githubRepo}
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Default ISO Settings */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Default ISO Source</h3>
        <div className="space-y-4">
          <div>
            <label className="form-label">Default Proxmox ISO URL</label>
            <input
              type="url"
              value={localSettings.defaultIsoUrl}
              onChange={(e) => setLocalSettings((s) => ({ ...s, defaultIsoUrl: e.target.value }))}
              placeholder="https://enterprise.proxmox.com/iso/proxmox-ve_8.4-1.iso"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Default SHA256 Checksum</label>
            <input
              type="text"
              value={localSettings.defaultIsoChecksum}
              onChange={(e) => setLocalSettings((s) => ({ ...s, defaultIsoChecksum: e.target.value }))}
              placeholder="sha256:..."
              className="form-input font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional. Get checksums from{' '}
              <a
                href="https://www.proxmox.com/en/downloads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pve-accent hover:underline"
              >
                proxmox.com/downloads
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* GitHub Secrets Info */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Required GitHub Secrets</h3>
        <p className="text-sm text-gray-400 mb-4">
          Configure these secrets in your repository settings to enable secure ISO building:
        </p>
        <div className="space-y-3">
          <SecretItem
            name="ROOT_PASSWORD"
            description="Root password for Proxmox installation"
            required
          />
          <SecretItem
            name="ROOT_SSH_KEY"
            description="SSH public key for root access (ed25519 or RSA)"
            required
          />
          <SecretItem
            name="GITHUB_TOKEN"
            description="For publishing releases (auto-provided by Actions)"
          />
        </div>
        <a
          href={`https://github.com/${localSettings.githubOwner}/${localSettings.githubRepo}/settings/secrets/actions`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-4 text-pve-accent hover:underline text-sm"
        >
          Configure Secrets
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          className={`btn-primary flex items-center gap-2 ${saved ? 'bg-green-600' : ''}`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Data Storage Info */}
      <div className="glass-card p-4 text-sm text-gray-400">
        <p>
          <strong className="text-white">Note:</strong> All settings and profiles are stored in your
          browser&apos;s localStorage. They persist across sessions but are not synced across devices.
          Use the Export feature to backup your profiles.
        </p>
      </div>
    </div>
  );
}

function SecretItem({
  name,
  description,
  required,
}: {
  name: string;
  description: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
      <code className="bg-black/30 px-2 py-0.5 rounded text-pve-accent text-sm flex-shrink-0">
        {name}
      </code>
      <div className="flex-1">
        <p className="text-sm text-gray-300">{description}</p>
        {required && <span className="text-xs text-yellow-500">Required</span>}
      </div>
    </div>
  );
}
