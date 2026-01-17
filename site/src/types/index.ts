export type Filesystem = 'zfs' | 'ext4' | 'xfs' | 'btrfs';
export type ZfsRaid = 'raid0' | 'raid1' | 'raid10' | 'raidz-1' | 'raidz-2' | 'raidz-3';
export type BtrfsRaid = 'raid0' | 'raid1' | 'raid10';
export type NetworkSource = 'from-dhcp' | 'from-answer';
export type RebootMode = 'reboot' | 'power-off';
export type FirstBootOrdering = 'before-network' | 'network-online' | 'fully-up';

export interface ZfsOptions {
  raid: ZfsRaid;
  ashift?: number;
  compress?: string;
  checksum?: string;
  arcMax?: number;
  copies?: number;
  hdsize?: number;
}

export interface LvmOptions {
  hdsize?: number;
  swapsize?: number;
  maxroot?: number;
  maxvz?: number;
  minfree?: number;
}

export interface BtrfsOptions {
  raid: BtrfsRaid;
  compress?: string;
  hdsize?: number;
}

export interface DiskSetup {
  filesystem: Filesystem;
  diskList?: string[];
  filter?: Record<string, string>;
  filterMatch?: 'any' | 'all';
  zfs?: ZfsOptions;
  lvm?: LvmOptions;
  btrfs?: BtrfsOptions;
}

export interface NetworkConfig {
  source: NetworkSource;
  cidr?: string;
  gateway?: string;
  dns?: string;
  filter?: Record<string, string>;
}

export interface GlobalConfig {
  keyboard: string;
  country: string;
  fqdn: string;
  mailto: string;
  timezone: string;
  rootPassword?: string;
  rootPasswordHashed?: string;
  rootSshKeys?: string[];
  rebootOnError?: boolean;
  rebootMode?: RebootMode;
}

export interface FirstBootConfig {
  source: 'from-iso' | 'from-url';
  ordering?: FirstBootOrdering;
  url?: string;
  certFingerprint?: string;
}

export interface PostInstallWebhook {
  url: string;
  certFingerprint?: string;
}

export interface NodeProfile {
  id: string;
  name: string;
  description?: string;
  global: GlobalConfig;
  network: NetworkConfig;
  diskSetup: DiskSetup;
  firstBoot?: FirstBootConfig;
  postInstallWebhook?: PostInstallWebhook;
  createdAt: string;
  updatedAt: string;
}

export interface BuildManifest {
  version: string;
  profiles: string[];
  isoSource: {
    type: 'url' | 'release';
    url?: string;
    checksum?: string;
    releaseTag?: string;
  };
  options: {
    publishRelease: boolean;
    releaseTag?: string;
  };
  generatedAt: string;
}

export interface AppState {
  profiles: NodeProfile[];
  currentProfile: NodeProfile | null;
  isEditing: boolean;
  buildManifest: BuildManifest | null;
}
