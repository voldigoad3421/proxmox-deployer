import { useState } from 'react';
import { Upload, Check, Loader2, AlertCircle, Rocket, Github } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  getStoredToken,
  pushFiles,
  triggerWorkflow,
} from '../utils/github';
import type { NodeProfile } from '../types';

interface SyncToGitHubProps {
  profiles: NodeProfile[];
  selectedOnly?: boolean;
}

export function SyncToGitHub({ profiles, selectedOnly = false }: SyncToGitHubProps) {
  const { settings, selectedProfiles } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [workflowResult, setWorkflowResult] = useState<{ success: boolean; message: string } | null>(null);

  const token = getStoredToken();
  const profilesToSync = selectedOnly
    ? profiles.filter((p) => selectedProfiles.includes(p.id))
    : profiles;

  const handleSync = async () => {
    if (!token) {
      setSyncResult({ success: false, message: 'Please connect GitHub first (Settings tab)' });
      return;
    }

    if (profilesToSync.length === 0) {
      setSyncResult({ success: false, message: 'No profiles to sync' });
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const files = profilesToSync.map((profile) => ({
        path: `profiles/${profile.name}.json`,
        content: JSON.stringify(profile, null, 2),
      }));

      await pushFiles(
        settings.githubOwner,
        settings.githubRepo,
        files,
        `Update profiles: ${profilesToSync.map((p) => p.name).join(', ')}\n\nPushed from Proxmox Deployer UI`,
        'master'
      );

      setSyncResult({
        success: true,
        message: `Synced ${profilesToSync.length} profile(s) to GitHub`,
      });
    } catch (err) {
      setSyncResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to sync',
      });
    }

    setIsSyncing(false);
  };

  const handleTriggerBuild = async () => {
    if (!token) {
      setWorkflowResult({ success: false, message: 'Please connect GitHub first (Settings tab)' });
      return;
    }

    setIsTriggering(true);
    setWorkflowResult(null);

    try {
      const profileNames = profilesToSync.map((p) => p.name).join(',');

      await triggerWorkflow(
        settings.githubOwner,
        settings.githubRepo,
        'build-proxmox-iso.yml',
        'master',
        {
          profiles: profileNames,
          iso_source: 'url',
          iso_url: 'https://enterprise.proxmox.com/iso/proxmox-ve_8.4-1.iso',
        }
      );

      setWorkflowResult({
        success: true,
        message: 'Build triggered! Check Actions tab for progress.',
      });
    } catch (err) {
      setWorkflowResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to trigger build',
      });
    }

    setIsTriggering(false);
  };

  if (!token) {
    return (
      <div className="glass-card p-4 border-l-4 border-yellow-500">
        <div className="flex items-start gap-3">
          <Github className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-medium">Connect GitHub to sync</p>
            <p className="text-sm text-gray-400">
              Go to <strong>Settings</strong> tab and connect your GitHub account to push profiles directly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSync}
          disabled={isSyncing || profilesToSync.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Sync {profilesToSync.length} Profile{profilesToSync.length !== 1 ? 's' : ''} to GitHub
        </button>

        <button
          onClick={handleTriggerBuild}
          disabled={isTriggering || profilesToSync.length === 0}
          className="btn-success flex items-center gap-2"
        >
          {isTriggering ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          Sync & Build ISOs
        </button>

        <a
          href={`https://github.com/${settings.githubOwner}/${settings.githubRepo}/actions`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm"
        >
          View Actions
        </a>
      </div>

      {syncResult && (
        <div
          className={`mt-3 p-2 rounded text-sm flex items-center gap-2 ${
            syncResult.success
              ? 'bg-green-500/20 border border-green-500/30 text-green-300'
              : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}
        >
          {syncResult.success ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {syncResult.message}
        </div>
      )}

      {workflowResult && (
        <div
          className={`mt-3 p-2 rounded text-sm flex items-center gap-2 ${
            workflowResult.success
              ? 'bg-green-500/20 border border-green-500/30 text-green-300'
              : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}
        >
          {workflowResult.success ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {workflowResult.message}
        </div>
      )}
    </div>
  );
}
