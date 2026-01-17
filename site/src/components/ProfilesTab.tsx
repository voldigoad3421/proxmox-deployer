import { Plus, Upload, Download, Trash2, Copy, Edit, CheckSquare, Square } from 'lucide-react';
import { useStore } from '../store/useStore';
import { exportProfiles, importProfiles as parseImport } from '../utils/storage';
import { downloadFile } from '../utils/tomlGenerator';
import type { NodeProfile } from '../types';

export function ProfilesTab() {
  const {
    profiles,
    selectedProfiles,
    setCurrentProfile,
    setIsEditing,
    deleteProfile,
    duplicateProfile,
    toggleProfileSelection,
    selectAllProfiles,
    clearProfileSelection,
    importProfiles,
  } = useStore();

  const handleNewProfile = () => {
    setIsEditing(true);
    setCurrentProfile(null);
  };

  const handleEdit = (profile: NodeProfile) => {
    setCurrentProfile(profile);
    setIsEditing(true);
  };

  const handleExport = () => {
    const data = exportProfiles(profiles);
    downloadFile(data, 'proxmox-profiles.json', 'application/json');
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const imported = parseImport(text);
          importProfiles(imported);
        } catch (err) {
          alert('Failed to import profiles. Please check the file format.');
        }
      }
    };
    input.click();
  };

  const handleDeleteSelected = () => {
    if (confirm(`Delete ${selectedProfiles.length} selected profile(s)?`)) {
      selectedProfiles.forEach((id) => deleteProfile(id));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Info Banner */}
      <div className="glass-card p-4 border-l-4 border-pve-accent">
        <div className="flex items-start gap-3">
          <div className="text-pve-accent text-xl">i</div>
          <div className="text-sm">
            <p className="text-white font-medium mb-1">How it works</p>
            <p className="text-gray-400">
              Profiles are saved in your browser. To build ISOs: <strong>1)</strong> Create profiles here,
              <strong> 2)</strong> Export them and commit to <code className="bg-black/30 px-1 rounded">/profiles/</code> in your repo,
              <strong> 3)</strong> Click <span className="text-green-400">Trigger Build</span> to run GitHub Actions.
            </p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={handleNewProfile} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Profile
          </button>
          <button onClick={handleImport} className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleExport}
            disabled={profiles.length === 0}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {profiles.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={selectedProfiles.length === profiles.length ? clearProfileSelection : selectAllProfiles}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              {selectedProfiles.length === profiles.length ? (
                <>
                  <Square className="w-4 h-4" /> Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" /> Select All
                </>
              )}
            </button>
            {selectedProfiles.length > 0 && (
              <button onClick={handleDeleteSelected} className="btn-danger flex items-center gap-2 text-sm">
                <Trash2 className="w-4 h-4" />
                Delete ({selectedProfiles.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Profiles Grid */}
      {profiles.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Server className="w-16 h-16 mx-auto text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Profiles Yet</h3>
          <p className="text-gray-400 mb-6">
            Create your first node profile to get started with automated Proxmox deployment.
          </p>
          <button onClick={handleNewProfile} className="btn-primary">
            <Plus className="w-4 h-4 inline mr-2" />
            Create First Profile
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isSelected={selectedProfiles.includes(profile.id)}
              onSelect={() => toggleProfileSelection(profile.id)}
              onEdit={() => handleEdit(profile)}
              onDuplicate={() => duplicateProfile(profile.id)}
              onDelete={() => {
                if (confirm(`Delete profile "${profile.name}"?`)) {
                  deleteProfile(profile.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Server({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  );
}

interface ProfileCardProps {
  profile: NodeProfile;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ProfileCard({ profile, isSelected, onSelect, onEdit, onDuplicate, onDelete }: ProfileCardProps) {
  const fsLabel = profile.diskSetup.filesystem.toUpperCase();
  const raidLabel = profile.diskSetup.zfs?.raid || profile.diskSetup.btrfs?.raid || 'Single';

  return (
    <div
      className={`
        glass-card-hover p-4 cursor-pointer
        ${isSelected ? 'ring-2 ring-pve-accent border-pve-accent' : ''}
      `}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              ${isSelected ? 'bg-pve-accent' : 'bg-white/10'}
            `}
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-white" />
            ) : (
              <Server className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white">{profile.name}</h3>
            <p className="text-sm text-gray-400">{profile.global.fqdn}</p>
          </div>
        </div>
      </div>

      {profile.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{profile.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded">
          {profile.network.source === 'from-dhcp' ? 'DHCP' : profile.network.cidr}
        </span>
        <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded">
          {fsLabel}
        </span>
        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-300 rounded">
          {raidLabel}
        </span>
      </div>

      <div className="flex items-center gap-1 pt-3 border-t border-white/10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Edit"
        >
          <Edit className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors ml-auto"
          title="Delete"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
}
