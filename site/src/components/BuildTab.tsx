import { useState } from 'react';
import { Hammer, ExternalLink, Download, AlertTriangle, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  generateAnswerToml,
  generateBuildManifest,
  generateBuildRequestIssueUrl,
  downloadFile,
} from '../utils/tomlGenerator';

export function BuildTab() {
  const { profiles, selectedProfiles, isoSource, setIsoSource, settings } = useStore();
  const [publishRelease, setPublishRelease] = useState(false);
  const [releaseTag, setReleaseTag] = useState('');

  const selectedProfileObjects = profiles.filter((p) => selectedProfiles.includes(p.id));
  const hasSelection = selectedProfileObjects.length > 0;

  const handleDownloadAnswers = () => {
    selectedProfileObjects.forEach((profile) => {
      const toml = generateAnswerToml(profile, true);
      downloadFile(toml, `${profile.name}-answer.toml`);
    });
  };

  const handleDownloadManifest = () => {
    const manifest = generateBuildManifest(
      selectedProfileObjects.map((p) => p.name),
      isoSource,
      { publishRelease, releaseTag }
    );
    downloadFile(manifest, 'build-manifest.json', 'application/json');
  };

  const handleOpenBuildIssue = () => {
    const url = generateBuildRequestIssueUrl(
      settings.githubOwner,
      settings.githubRepo,
      selectedProfileObjects,
      isoSource
    );
    window.open(url, '_blank');
  };

  const workflowDispatchUrl = `https://github.com/${settings.githubOwner}/${settings.githubRepo}/actions/workflows/build-proxmox-iso.yml`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Selection Summary */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pve-accent/20 rounded-lg">
              <Hammer className="w-6 h-6 text-pve-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Build Configuration</h2>
              <p className="text-sm text-gray-400">
                {hasSelection
                  ? `${selectedProfiles.length} profile(s) selected for build`
                  : 'Select profiles from the Profiles tab to build ISOs'}
              </p>
            </div>
          </div>
          {hasSelection && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">{selectedProfiles.length} Ready</span>
            </div>
          )}
        </div>

        {hasSelection && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedProfileObjects.map((profile) => (
              <span
                key={profile.id}
                className="px-3 py-1 bg-pve-accent/20 text-pve-accent rounded-full text-sm"
              >
                {profile.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ISO Source Configuration */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">ISO Source</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={isoSource.type === 'url'}
                onChange={() => setIsoSource({ type: 'url' })}
                className="w-4 h-4 text-pve-accent"
              />
              <span>Download from URL</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={isoSource.type === 'release'}
                onChange={() => setIsoSource({ type: 'release' })}
                className="w-4 h-4 text-pve-accent"
              />
              <span>Use GitHub Release Asset</span>
            </label>
          </div>

          {isoSource.type === 'url' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="form-label">Proxmox ISO URL</label>
                <input
                  type="url"
                  value={isoSource.url}
                  onChange={(e) => setIsoSource({ url: e.target.value })}
                  placeholder="https://enterprise.proxmox.com/iso/proxmox-ve_8.4-1.iso"
                  className="form-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Official ISO downloads:{' '}
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
              <div>
                <label className="form-label">SHA256 Checksum (optional but recommended)</label>
                <input
                  type="text"
                  value={isoSource.checksum}
                  onChange={(e) => setIsoSource({ checksum: e.target.value })}
                  placeholder="sha256:abc123..."
                  className="form-input font-mono text-sm"
                />
              </div>
            </div>
          )}

          {isoSource.type === 'release' && (
            <div className="animate-fade-in">
              <label className="form-label">Release Tag</label>
              <input
                type="text"
                value={isoSource.releaseTag}
                onChange={(e) => setIsoSource({ releaseTag: e.target.value })}
                placeholder="e.g., v8.4-1 or latest"
                className="form-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload your base ISO to a GitHub Release and specify the tag here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Release Options */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Output Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="font-medium text-white">Publish to GitHub Release</p>
              <p className="text-sm text-gray-400">
                Attach built ISOs to a GitHub Release (requires GITHUB_TOKEN)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={publishRelease}
                onChange={(e) => setPublishRelease(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-pve-accent rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pve-accent"></div>
            </label>
          </div>

          {publishRelease && (
            <div className="animate-fade-in">
              <label className="form-label">Release Tag (for output)</label>
              <input
                type="text"
                value={releaseTag}
                onChange={(e) => setReleaseTag(e.target.value)}
                placeholder="e.g., build-2024-01-15"
                className="form-input"
              />
            </div>
          )}
        </div>
      </div>

      {/* Build Actions */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Build Actions</h3>

        {!hasSelection && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200">
                No profiles selected. Go to the <strong>Node Profiles</strong> tab and select one or more profiles to build.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={handleDownloadAnswers}
            disabled={!hasSelection}
            className="btn-secondary flex flex-col items-center gap-2 py-4"
          >
            <Download className="w-6 h-6" />
            <span>Download answer.toml Files</span>
            <span className="text-xs text-gray-400">For manual ISO building</span>
          </button>

          <button
            onClick={handleDownloadManifest}
            disabled={!hasSelection}
            className="btn-secondary flex flex-col items-center gap-2 py-4"
          >
            <Download className="w-6 h-6" />
            <span>Download Build Manifest</span>
            <span className="text-xs text-gray-400">JSON config for Actions</span>
          </button>

          <button
            onClick={handleOpenBuildIssue}
            disabled={!hasSelection}
            className="btn-primary flex flex-col items-center gap-2 py-4"
          >
            <ExternalLink className="w-6 h-6" />
            <span>Create Build Request Issue</span>
            <span className="text-xs text-white/70">Opens GitHub with pre-filled issue</span>
          </button>
        </div>

        <div className="mt-6 p-4 bg-white/5 rounded-lg">
          <h4 className="font-medium text-white mb-2 flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Direct Workflow Link
          </h4>
          <p className="text-sm text-gray-400 mb-3">
            Trigger the build workflow directly from GitHub Actions:
          </p>
          <a
            href={workflowDispatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-pve-accent hover:underline text-sm break-all"
          >
            {workflowDispatchUrl}
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
          </a>
        </div>
      </div>

      {/* Instructions */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">How to Build ISOs</h3>
        <div className="space-y-4 text-sm text-gray-300">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-pve-accent/20 text-pve-accent rounded-full flex items-center justify-center text-xs font-bold">
              1
            </span>
            <div>
              <p className="font-medium text-white">Select Profiles</p>
              <p className="text-gray-400">Choose one or more node profiles from the Profiles tab</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-pve-accent/20 text-pve-accent rounded-full flex items-center justify-center text-xs font-bold">
              2
            </span>
            <div>
              <p className="font-medium text-white">Configure ISO Source</p>
              <p className="text-gray-400">Provide the Proxmox ISO URL or select a Release asset</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-pve-accent/20 text-pve-accent rounded-full flex items-center justify-center text-xs font-bold">
              3
            </span>
            <div>
              <p className="font-medium text-white">Trigger Build</p>
              <p className="text-gray-400">
                Either create a GitHub Issue (which triggers the workflow via automation) or manually
                run the workflow with workflow_dispatch
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-pve-accent/20 text-pve-accent rounded-full flex items-center justify-center text-xs font-bold">
              4
            </span>
            <div>
              <p className="font-medium text-white">Download ISOs</p>
              <p className="text-gray-400">
                Built ISOs are available as workflow artifacts or attached to a GitHub Release
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
