import { useState, useEffect } from 'react';
import { X, Eye, Save, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateAnswerToml, downloadFile } from '../utils/tomlGenerator';
import { nodeProfileSchema, keyboardLayouts, timezones, countries } from '../schemas/answerSchema';
import type { NodeProfile, Filesystem, ZfsRaid, BtrfsRaid, NetworkSource } from '../types';
import { generateProfileId } from '../utils/storage';

const defaultProfile: Omit<NodeProfile, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  global: {
    keyboard: 'en-us',
    country: 'us',
    fqdn: '',
    mailto: '',
    timezone: 'UTC',
    rebootOnError: false,
    rebootMode: 'reboot',
  },
  network: {
    source: 'from-dhcp',
  },
  diskSetup: {
    filesystem: 'zfs',
    zfs: {
      raid: 'raid1',
      ashift: 12,
      compress: 'lz4',
    },
  },
};

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { currentProfile, isEditing, addProfile, updateProfile } = useStore();

  const [formData, setFormData] = useState<Omit<NodeProfile, 'id' | 'createdAt' | 'updatedAt'>>(
    currentProfile || defaultProfile
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<'global' | 'network' | 'disk' | 'advanced'>('global');

  useEffect(() => {
    if (currentProfile && isEditing) {
      setFormData(currentProfile);
    } else if (isEditing && !currentProfile) {
      setFormData(defaultProfile);
    }
  }, [currentProfile, isEditing]);

  const validateForm = (): boolean => {
    try {
      const now = new Date().toISOString();
      nodeProfileSchema.parse({
        ...formData,
        id: currentProfile?.id || generateProfileId(),
        createdAt: currentProfile?.createdAt || now,
        updatedAt: now,
        global: {
          ...formData.global,
          rootPassword: 'placeholder', // Will be replaced by secret
        },
      });
      setErrors({});
      return true;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err) {
        const zodErr = err as { errors: Array<{ path: (string | number)[]; message: string }> };
        const newErrors: Record<string, string> = {};
        zodErr.errors.forEach((e) => {
          const path = e.path.join('.');
          newErrors[path] = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSave = () => {
    if (!validateForm()) return;

    if (currentProfile) {
      updateProfile(currentProfile.id, formData);
    } else {
      addProfile(formData);
    }
    onClose();
  };

  const handleDownloadToml = () => {
    const now = new Date().toISOString();
    const profile: NodeProfile = {
      ...formData,
      id: currentProfile?.id || generateProfileId(),
      createdAt: currentProfile?.createdAt || now,
      updatedAt: now,
    };
    const toml = generateAnswerToml(profile, false);
    downloadFile(toml, `${formData.name || 'answer'}.toml`);
  };

  const updateField = <K extends keyof typeof formData>(
    key: K,
    value: typeof formData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateGlobal = <K extends keyof typeof formData.global>(
    key: K,
    value: typeof formData.global[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      global: { ...prev.global, [key]: value },
    }));
  };

  const updateNetwork = <K extends keyof typeof formData.network>(
    key: K,
    value: typeof formData.network[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      network: { ...prev.network, [key]: value },
    }));
  };

  const updateDiskSetup = <K extends keyof typeof formData.diskSetup>(
    key: K,
    value: typeof formData.diskSetup[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      diskSetup: { ...prev.diskSetup, [key]: value },
    }));
  };

  const handleFilesystemChange = (fs: Filesystem) => {
    const newDiskSetup = { ...formData.diskSetup, filesystem: fs };

    // Reset filesystem-specific options
    delete newDiskSetup.zfs;
    delete newDiskSetup.lvm;
    delete newDiskSetup.btrfs;

    if (fs === 'zfs') {
      newDiskSetup.zfs = { raid: 'raid1', ashift: 12, compress: 'lz4' };
    } else if (fs === 'ext4' || fs === 'xfs') {
      newDiskSetup.lvm = {};
    } else if (fs === 'btrfs') {
      newDiskSetup.btrfs = { raid: 'raid1' };
    }

    setFormData((prev) => ({ ...prev, diskSetup: newDiskSetup }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            {currentProfile ? `Edit: ${currentProfile.name}` : 'New Node Profile'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`btn-secondary text-sm ${showPreview ? 'bg-pve-accent/20' : ''}`}
            >
              <Eye className="w-4 h-4 inline mr-1" />
              Preview
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Form */}
          <div className={`flex-1 overflow-y-auto p-4 ${showPreview ? 'w-1/2' : 'w-full'}`}>
            {/* Section Tabs */}
            <div className="flex gap-1 mb-4 p-1 bg-white/5 rounded-lg">
              {(['global', 'network', 'disk', 'advanced'] as const).map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors capitalize ${
                    activeSection === section
                      ? 'bg-pve-accent text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>

            {/* Basic Info (always visible) */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Profile Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="e.g., trinity"
                    className="form-input"
                  />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    value={formData.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Optional description"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Global Section */}
            {activeSection === 'global' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">
                  System Settings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">FQDN *</label>
                    <input
                      type="text"
                      value={formData.global.fqdn}
                      onChange={(e) => updateGlobal('fqdn', e.target.value)}
                      placeholder="e.g., trinity.zion.local"
                      className="form-input"
                    />
                    {errors['global.fqdn'] && (
                      <p className="text-red-400 text-xs mt-1">{errors['global.fqdn']}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Admin Email *</label>
                    <input
                      type="email"
                      value={formData.global.mailto}
                      onChange={(e) => updateGlobal('mailto', e.target.value)}
                      placeholder="admin@example.com"
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Keyboard</label>
                    <select
                      value={formData.global.keyboard}
                      onChange={(e) => updateGlobal('keyboard', e.target.value)}
                      className="form-select"
                    >
                      {keyboardLayouts.map((kb) => (
                        <option key={kb} value={kb}>{kb}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Country</label>
                    <select
                      value={formData.global.country}
                      onChange={(e) => updateGlobal('country', e.target.value)}
                      className="form-select"
                    >
                      {countries.map((c) => (
                        <option key={c} value={c}>{c.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Timezone</label>
                    <select
                      value={formData.global.timezone}
                      onChange={(e) => updateGlobal('timezone', e.target.value)}
                      className="form-select"
                    >
                      {timezones.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-yellow-200 font-medium">Root Password & SSH Keys</p>
                      <p className="text-yellow-200/70">
                        These will be injected from GitHub Secrets during the build.
                        Configure <code className="bg-black/30 px-1 rounded">ROOT_PASSWORD</code> and{' '}
                        <code className="bg-black/30 px-1 rounded">ROOT_SSH_KEY</code> in your repository secrets.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Network Section */}
            {activeSection === 'network' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">
                  Network Configuration
                </h3>
                <div>
                  <label className="form-label">Network Source *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.network.source === 'from-dhcp'}
                        onChange={() => updateNetwork('source', 'from-dhcp' as NetworkSource)}
                        className="w-4 h-4 text-pve-accent"
                      />
                      <span>DHCP</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.network.source === 'from-answer'}
                        onChange={() => updateNetwork('source', 'from-answer' as NetworkSource)}
                        className="w-4 h-4 text-pve-accent"
                      />
                      <span>Static IP</span>
                    </label>
                  </div>
                </div>

                {formData.network.source === 'from-answer' && (
                  <div className="grid grid-cols-3 gap-4 animate-fade-in">
                    <div>
                      <label className="form-label">IP/CIDR *</label>
                      <input
                        type="text"
                        value={formData.network.cidr || ''}
                        onChange={(e) => updateNetwork('cidr', e.target.value)}
                        placeholder="172.20.0.10/24"
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Gateway *</label>
                      <input
                        type="text"
                        value={formData.network.gateway || ''}
                        onChange={(e) => updateNetwork('gateway', e.target.value)}
                        placeholder="172.20.0.1"
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">DNS *</label>
                      <input
                        type="text"
                        value={formData.network.dns || ''}
                        onChange={(e) => updateNetwork('dns', e.target.value)}
                        placeholder="172.20.0.1"
                        className="form-input"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Disk Section */}
            {activeSection === 'disk' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">
                  Disk Setup
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Filesystem *</label>
                    <select
                      value={formData.diskSetup.filesystem}
                      onChange={(e) => handleFilesystemChange(e.target.value as Filesystem)}
                      className="form-select"
                    >
                      <option value="zfs">ZFS (Recommended)</option>
                      <option value="ext4">ext4 (LVM)</option>
                      <option value="xfs">XFS (LVM)</option>
                      <option value="btrfs">Btrfs (Tech Preview)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Disk List (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.diskSetup.diskList?.join(', ') || ''}
                      onChange={(e) => updateDiskSetup('diskList', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="sda, sdb"
                      className="form-input"
                    />
                  </div>
                </div>

                {/* ZFS Options */}
                {formData.diskSetup.filesystem === 'zfs' && (
                  <div className="space-y-4 p-4 bg-white/5 rounded-lg">
                    <h4 className="font-medium text-white">ZFS Options</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="form-label">RAID Level</label>
                        <select
                          value={formData.diskSetup.zfs?.raid || 'raid1'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            diskSetup: {
                              ...prev.diskSetup,
                              zfs: { ...prev.diskSetup.zfs!, raid: e.target.value as ZfsRaid }
                            }
                          }))}
                          className="form-select"
                        >
                          <option value="raid0">RAID0 (Stripe)</option>
                          <option value="raid1">RAID1 (Mirror)</option>
                          <option value="raid10">RAID10</option>
                          <option value="raidz-1">RAIDZ-1</option>
                          <option value="raidz-2">RAIDZ-2</option>
                          <option value="raidz-3">RAIDZ-3</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Compression</label>
                        <select
                          value={formData.diskSetup.zfs?.compress || 'lz4'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            diskSetup: {
                              ...prev.diskSetup,
                              zfs: { ...prev.diskSetup.zfs!, compress: e.target.value }
                            }
                          }))}
                          className="form-select"
                        >
                          <option value="lz4">LZ4 (Fast)</option>
                          <option value="zstd">ZSTD (Better Ratio)</option>
                          <option value="on">On (Default)</option>
                          <option value="off">Off</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Ashift (Sector Size)</label>
                        <select
                          value={formData.diskSetup.zfs?.ashift || 12}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            diskSetup: {
                              ...prev.diskSetup,
                              zfs: { ...prev.diskSetup.zfs!, ashift: parseInt(e.target.value) }
                            }
                          }))}
                          className="form-select"
                        >
                          <option value={9}>9 (512B)</option>
                          <option value={12}>12 (4K - Recommended)</option>
                          <option value={13}>13 (8K)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">ARC Max (MiB)</label>
                        <input
                          type="number"
                          value={formData.diskSetup.zfs?.arcMax || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            diskSetup: {
                              ...prev.diskSetup,
                              zfs: { ...prev.diskSetup.zfs!, arcMax: e.target.value ? parseInt(e.target.value) : undefined }
                            }
                          }))}
                          placeholder="Auto"
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label">Total Disk Size (GB)</label>
                        <input
                          type="number"
                          value={formData.diskSetup.zfs?.hdsize || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            diskSetup: {
                              ...prev.diskSetup,
                              zfs: { ...prev.diskSetup.zfs!, hdsize: e.target.value ? parseInt(e.target.value) : undefined }
                            }
                          }))}
                          placeholder="Full disk"
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Btrfs Options */}
                {formData.diskSetup.filesystem === 'btrfs' && (
                  <div className="space-y-4 p-4 bg-white/5 rounded-lg">
                    <h4 className="font-medium text-white">Btrfs Options</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">RAID Level</label>
                        <select
                          value={formData.diskSetup.btrfs?.raid || 'raid1'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            diskSetup: {
                              ...prev.diskSetup,
                              btrfs: { ...prev.diskSetup.btrfs!, raid: e.target.value as BtrfsRaid }
                            }
                          }))}
                          className="form-select"
                        >
                          <option value="raid0">RAID0</option>
                          <option value="raid1">RAID1</option>
                          <option value="raid10">RAID10</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Compression</label>
                        <select
                          value={formData.diskSetup.btrfs?.compress || 'zstd'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            diskSetup: {
                              ...prev.diskSetup,
                              btrfs: { ...prev.diskSetup.btrfs!, compress: e.target.value }
                            }
                          }))}
                          className="form-select"
                        >
                          <option value="zstd">ZSTD</option>
                          <option value="lzo">LZO</option>
                          <option value="zlib">ZLIB</option>
                          <option value="off">Off</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Advanced Section */}
            {activeSection === 'advanced' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">
                  Advanced Options
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="font-medium text-white">Reboot on Error</p>
                      <p className="text-sm text-gray-400">Automatically reboot if installation fails</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.global.rebootOnError || false}
                        onChange={(e) => updateGlobal('rebootOnError', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-pve-accent rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pve-accent"></div>
                    </label>
                  </div>
                  <div>
                    <label className="form-label">Reboot Mode</label>
                    <select
                      value={formData.global.rebootMode || 'reboot'}
                      onChange={(e) => updateGlobal('rebootMode', e.target.value as 'reboot' | 'power-off')}
                      className="form-select"
                    >
                      <option value="reboot">Reboot</option>
                      <option value="power-off">Power Off</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="w-1/2 border-l border-white/10 overflow-y-auto bg-black/20">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">answer.toml Preview</h3>
                <pre className="code-block text-xs whitespace-pre-wrap">
                  {generateAnswerToml(
                    {
                      ...formData,
                      id: currentProfile?.id || 'preview',
                      createdAt: currentProfile?.createdAt || new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                    true
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-white/5">
          <button onClick={handleDownloadToml} className="btn-secondary text-sm">
            Download answer.toml
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              {currentProfile ? 'Update Profile' : 'Create Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
