import { z } from 'zod';

// Keyboard layouts
export const keyboardLayouts = [
  'en-us', 'de', 'de-ch', 'dk', 'es', 'fi', 'fr', 'fr-be', 'fr-ca', 'fr-ch',
  'hu', 'is', 'it', 'jp', 'lt', 'mk', 'nl', 'no', 'pl', 'pt', 'pt-br', 'se',
  'si', 'tr', 'uk', 'us'
] as const;

// Common timezones
export const timezones = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Amsterdam', 'Europe/Rome', 'Europe/Madrid', 'Europe/Stockholm', 'Europe/Warsaw',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Seoul', 'Asia/Mumbai',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland'
] as const;

// Countries (ISO 3166-1 alpha-2)
export const countries = [
  'us', 'ca', 'gb', 'de', 'fr', 'es', 'it', 'nl', 'be', 'ch', 'at', 'au', 'nz',
  'jp', 'kr', 'cn', 'sg', 'in', 'br', 'mx', 'se', 'no', 'dk', 'fi', 'pl', 'cz'
] as const;

// ZFS Compression options
export const zfsCompression = ['on', 'off', 'lz4', 'lzjb', 'zle', 'gzip', 'zstd'] as const;

// ZFS Checksum options
export const zfsChecksum = ['on', 'fletcher4', 'sha256'] as const;

// Validation schemas
export const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
export const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
export const fqdnRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const sshKeyRegex = /^(ssh-(rsa|ed25519|dss)|ecdsa-sha2-nistp(256|384|521))\s+[A-Za-z0-9+/=]+(\s+.*)?$/;

export const zfsOptionsSchema = z.object({
  raid: z.enum(['raid0', 'raid1', 'raid10', 'raidz-1', 'raidz-2', 'raidz-3']),
  ashift: z.number().min(9).max(16).optional(),
  compress: z.enum(zfsCompression).optional(),
  checksum: z.enum(zfsChecksum).optional(),
  arcMax: z.number().min(64).optional(),
  copies: z.number().min(1).max(3).optional(),
  hdsize: z.number().min(1).optional(),
});

export const lvmOptionsSchema = z.object({
  hdsize: z.number().min(1).optional(),
  swapsize: z.number().min(0).optional(),
  maxroot: z.number().min(1).optional(),
  maxvz: z.number().min(0).optional(),
  minfree: z.number().min(0).optional(),
});

export const btrfsOptionsSchema = z.object({
  raid: z.enum(['raid0', 'raid1', 'raid10']),
  compress: z.enum(['on', 'off', 'zlib', 'lzo', 'zstd']).optional(),
  hdsize: z.number().min(1).optional(),
});

export const diskSetupSchema = z.object({
  filesystem: z.enum(['zfs', 'ext4', 'xfs', 'btrfs']),
  diskList: z.array(z.string()).optional(),
  filter: z.record(z.string()).optional(),
  filterMatch: z.enum(['any', 'all']).optional(),
  zfs: zfsOptionsSchema.optional(),
  lvm: lvmOptionsSchema.optional(),
  btrfs: btrfsOptionsSchema.optional(),
}).refine(
  (data) => {
    if (data.filesystem === 'zfs' && !data.zfs) return false;
    if ((data.filesystem === 'ext4' || data.filesystem === 'xfs') && data.zfs) return false;
    if (data.filesystem === 'btrfs' && !data.btrfs) return false;
    return true;
  },
  { message: 'Filesystem options must match selected filesystem type' }
);

export const networkConfigSchema = z.object({
  source: z.enum(['from-dhcp', 'from-answer']),
  cidr: z.string().regex(cidrRegex, 'Invalid CIDR notation').optional(),
  gateway: z.string().regex(ipv4Regex, 'Invalid gateway IP').optional(),
  dns: z.string().regex(ipv4Regex, 'Invalid DNS IP').optional(),
  filter: z.record(z.string()).optional(),
}).refine(
  (data) => {
    if (data.source === 'from-answer') {
      return data.cidr && data.gateway && data.dns;
    }
    return true;
  },
  { message: 'Static network config requires CIDR, gateway, and DNS' }
);

export const globalConfigSchema = z.object({
  keyboard: z.enum(keyboardLayouts),
  country: z.enum(countries),
  fqdn: z.string().regex(fqdnRegex, 'Invalid FQDN format'),
  mailto: z.string().regex(emailRegex, 'Invalid email format'),
  timezone: z.string().min(1),
  rootPassword: z.string().min(5).optional(),
  rootPasswordHashed: z.string().optional(),
  rootSshKeys: z.array(z.string().regex(sshKeyRegex, 'Invalid SSH key format')).optional(),
  rebootOnError: z.boolean().optional(),
  rebootMode: z.enum(['reboot', 'power-off']).optional(),
}).refine(
  (data) => data.rootPassword || data.rootPasswordHashed,
  { message: 'Either root password or hashed password is required' }
);

export const firstBootConfigSchema = z.object({
  source: z.enum(['from-iso', 'from-url']),
  ordering: z.enum(['before-network', 'network-online', 'fully-up']).optional(),
  url: z.string().url().optional(),
  certFingerprint: z.string().optional(),
}).refine(
  (data) => {
    if (data.source === 'from-url' && !data.url) return false;
    return true;
  },
  { message: 'URL is required when source is from-url' }
);

export const postInstallWebhookSchema = z.object({
  url: z.string().url(),
  certFingerprint: z.string().optional(),
});

export const nodeProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  global: globalConfigSchema,
  network: networkConfigSchema,
  diskSetup: diskSetupSchema,
  firstBoot: firstBootConfigSchema.optional(),
  postInstallWebhook: postInstallWebhookSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const buildManifestSchema = z.object({
  version: z.string(),
  profiles: z.array(z.string()).min(1),
  isoSource: z.object({
    type: z.enum(['url', 'release']),
    url: z.string().url().optional(),
    checksum: z.string().optional(),
    releaseTag: z.string().optional(),
  }),
  options: z.object({
    publishRelease: z.boolean(),
    releaseTag: z.string().optional(),
  }),
  generatedAt: z.string(),
});

export type NodeProfileInput = z.input<typeof nodeProfileSchema>;
export type BuildManifestInput = z.input<typeof buildManifestSchema>;
