import { create } from 'zustand';
import type { NodeProfile, BuildManifest } from '../types';
import { loadProfiles, saveProfiles, loadSettings, saveSettings, generateProfileId, type AppSettings } from '../utils/storage';

interface StoreState {
  // Profiles
  profiles: NodeProfile[];
  selectedProfiles: string[];
  currentProfile: NodeProfile | null;
  isEditing: boolean;

  // Build
  buildManifest: BuildManifest | null;
  isoSource: {
    type: 'url' | 'release';
    url: string;
    checksum: string;
    releaseTag: string;
  };

  // Settings
  settings: AppSettings;

  // UI State
  activeTab: 'profiles' | 'build' | 'netboot' | 'settings';
  showPreview: boolean;

  // Actions
  loadInitialData: () => void;
  addProfile: (profile: Omit<NodeProfile, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProfile: (id: string, profile: Partial<NodeProfile>) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => void;
  setCurrentProfile: (profile: NodeProfile | null) => void;
  setIsEditing: (isEditing: boolean) => void;
  toggleProfileSelection: (id: string) => void;
  selectAllProfiles: () => void;
  clearProfileSelection: () => void;
  setIsoSource: (source: Partial<StoreState['isoSource']>) => void;
  setBuildManifest: (manifest: BuildManifest | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setActiveTab: (tab: StoreState['activeTab']) => void;
  setShowPreview: (show: boolean) => void;
  importProfiles: (profiles: NodeProfile[]) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  // Initial state
  profiles: [],
  selectedProfiles: [],
  currentProfile: null,
  isEditing: false,
  buildManifest: null,
  isoSource: {
    type: 'url',
    url: 'https://enterprise.proxmox.com/iso/proxmox-ve_8.4-1.iso',
    checksum: '',
    releaseTag: '',
  },
  settings: loadSettings(),
  activeTab: 'profiles',
  showPreview: false,

  // Actions
  loadInitialData: () => {
    const profiles = loadProfiles();
    const settings = loadSettings();
    set({ profiles, settings });
  },

  addProfile: (profileData) => {
    const now = new Date().toISOString();
    const newProfile: NodeProfile = {
      ...profileData,
      id: generateProfileId(),
      createdAt: now,
      updatedAt: now,
    };
    const profiles = [...get().profiles, newProfile];
    saveProfiles(profiles);
    set({ profiles, currentProfile: newProfile, isEditing: false });
  },

  updateProfile: (id, updates) => {
    const profiles = get().profiles.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    saveProfiles(profiles);
    const currentProfile = get().currentProfile;
    set({
      profiles,
      currentProfile: currentProfile?.id === id ? { ...currentProfile, ...updates } : currentProfile,
      isEditing: false,
    });
  },

  deleteProfile: (id) => {
    const profiles = get().profiles.filter((p) => p.id !== id);
    saveProfiles(profiles);
    set({
      profiles,
      currentProfile: get().currentProfile?.id === id ? null : get().currentProfile,
      selectedProfiles: get().selectedProfiles.filter((pid) => pid !== id),
    });
  },

  duplicateProfile: (id) => {
    const profile = get().profiles.find((p) => p.id === id);
    if (profile) {
      const now = new Date().toISOString();
      const newProfile: NodeProfile = {
        ...profile,
        id: generateProfileId(),
        name: `${profile.name} (copy)`,
        createdAt: now,
        updatedAt: now,
      };
      const profiles = [...get().profiles, newProfile];
      saveProfiles(profiles);
      set({ profiles, currentProfile: newProfile });
    }
  },

  setCurrentProfile: (profile) => set({ currentProfile: profile }),
  setIsEditing: (isEditing) => set({ isEditing }),

  toggleProfileSelection: (id) => {
    const selected = get().selectedProfiles;
    if (selected.includes(id)) {
      set({ selectedProfiles: selected.filter((pid) => pid !== id) });
    } else {
      set({ selectedProfiles: [...selected, id] });
    }
  },

  selectAllProfiles: () => {
    set({ selectedProfiles: get().profiles.map((p) => p.id) });
  },

  clearProfileSelection: () => set({ selectedProfiles: [] }),

  setIsoSource: (source) => {
    set({ isoSource: { ...get().isoSource, ...source } });
  },

  setBuildManifest: (manifest) => set({ buildManifest: manifest }),

  updateSettings: (updates) => {
    const settings = { ...get().settings, ...updates };
    saveSettings(settings);
    set({ settings });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowPreview: (show) => set({ showPreview: show }),

  importProfiles: (newProfiles) => {
    const existingIds = new Set(get().profiles.map((p) => p.id));
    const uniqueProfiles = newProfiles.map((p) => {
      if (existingIds.has(p.id)) {
        return { ...p, id: generateProfileId() };
      }
      return p;
    });
    const profiles = [...get().profiles, ...uniqueProfiles];
    saveProfiles(profiles);
    set({ profiles });
  },
}));
