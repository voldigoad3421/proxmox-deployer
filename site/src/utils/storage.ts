import type { NodeProfile } from '../types';

const STORAGE_KEY = 'proxmox-deployer-profiles';
const SETTINGS_KEY = 'proxmox-deployer-settings';

export interface AppSettings {
  githubOwner: string;
  githubRepo: string;
  defaultIsoUrl: string;
  defaultIsoChecksum: string;
}

const defaultSettings: AppSettings = {
  githubOwner: 'voldigoad3421',
  githubRepo: 'proxmox-deployer',
  defaultIsoUrl: 'https://enterprise.proxmox.com/iso/proxmox-ve_8.4-1.iso',
  defaultIsoChecksum: 'sha256:c45a30b1c4d3895f4a5c0e80fceee6fd8e7f1f5c6c3e8d9b7a3f2e1c0d9b8a7f',
};

export function loadProfiles(): NodeProfile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load profiles:', e);
  }
  return [];
}

export function saveProfiles(profiles: NodeProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save profiles:', e);
  }
}

export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return defaultSettings;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function exportProfiles(profiles: NodeProfile[]): string {
  return JSON.stringify({ version: '1.0', profiles, exportedAt: new Date().toISOString() }, null, 2);
}

export function importProfiles(jsonString: string): NodeProfile[] {
  const data = JSON.parse(jsonString);
  if (data.version && Array.isArray(data.profiles)) {
    return data.profiles;
  }
  throw new Error('Invalid export format');
}

export function generateProfileId(): string {
  return `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
