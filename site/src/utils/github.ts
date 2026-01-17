// GitHub API integration for static site
// Uses OAuth Device Flow (no backend required)

const GITHUB_API = 'https://api.github.com';
const GITHUB_DEVICE_AUTH = 'https://github.com/login/device/code';
const GITHUB_OAUTH_TOKEN = 'https://github.com/login/oauth/access_token';
const STORAGE_KEY = 'github-token';
const USER_KEY = 'github-user';
const CLIENT_ID_KEY = 'github-client-id';

// Default OAuth App Client ID (users can create their own)
// This is safe to expose - client_id is public
const DEFAULT_CLIENT_ID = '';

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
}

// Token management
export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): GitHubUser | null {
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function storeUser(user: GitHubUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// API helpers
async function githubFetch(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<Response> {
  const authToken = token || getStoredToken();
  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${GITHUB_API}${endpoint}`, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }

  return response;
}

// Verify token and get user info
export async function verifyToken(token: string): Promise<GitHubUser> {
  const response = await githubFetch('/user', {}, token);
  const user = await response.json();
  return {
    login: user.login,
    avatar_url: user.avatar_url,
    name: user.name,
  };
}

// Check if user has access to repo
export async function checkRepoAccess(owner: string, repo: string): Promise<boolean> {
  try {
    await githubFetch(`/repos/${owner}/${repo}`);
    return true;
  } catch {
    return false;
  }
}

// Get file content from repo
export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  branch = 'master'
): Promise<{ content: string; sha: string } | null> {
  try {
    const response = await githubFetch(
      `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    );
    const data = await response.json();
    return {
      content: atob(data.content),
      sha: data.sha,
    };
  } catch {
    return null;
  }
}

// Create or update file in repo
export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch = 'master',
  sha?: string
): Promise<void> {
  // Get existing file SHA if not provided
  if (!sha) {
    const existing = await getFileContent(owner, repo, path, branch);
    sha = existing?.sha;
  }

  await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: btoa(content),
      branch,
      sha,
    }),
  });
}

// Push multiple files in a single commit
export async function pushFiles(
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string }>,
  message: string,
  branch = 'master'
): Promise<void> {
  // Get the current commit SHA
  const refResponse = await githubFetch(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  const refData = await refResponse.json();
  const currentCommitSha = refData.object.sha;

  // Get the current tree
  const commitResponse = await githubFetch(`/repos/${owner}/${repo}/git/commits/${currentCommitSha}`);
  const commitData = await commitResponse.json();
  const currentTreeSha = commitData.tree.sha;

  // Create blobs for each file
  const blobs = await Promise.all(
    files.map(async (file) => {
      const blobResponse = await githubFetch(`/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({
          content: file.content,
          encoding: 'utf-8',
        }),
      });
      const blobData = await blobResponse.json();
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blobData.sha,
      };
    })
  );

  // Create new tree
  const treeResponse = await githubFetch(`/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: currentTreeSha,
      tree: blobs,
    }),
  });
  const treeData = await treeResponse.json();

  // Create commit
  const newCommitResponse = await githubFetch(`/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [currentCommitSha],
    }),
  });
  const newCommitData = await newCommitResponse.json();

  // Update reference
  await githubFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({
      sha: newCommitData.sha,
    }),
  });
}

// Trigger workflow dispatch
export async function triggerWorkflow(
  owner: string,
  repo: string,
  workflowId: string,
  ref = 'master',
  inputs: Record<string, string> = {}
): Promise<void> {
  await githubFetch(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({
      ref,
      inputs,
    }),
  });
}

// List workflow runs
export async function getWorkflowRuns(
  owner: string,
  repo: string,
  workflowId: string,
  limit = 5
): Promise<Array<{
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}>> {
  const response = await githubFetch(
    `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=${limit}`
  );
  const data = await response.json();
  return data.workflow_runs.map((run: any) => ({
    id: run.id,
    status: run.status,
    conclusion: run.conclusion,
    created_at: run.created_at,
    html_url: run.html_url,
  }));
}

// Get artifacts from a workflow run
export async function getArtifacts(
  owner: string,
  repo: string,
  runId: number
): Promise<Array<{
  id: number;
  name: string;
  size_in_bytes: number;
  archive_download_url: string;
}>> {
  const response = await githubFetch(
    `/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`
  );
  const data = await response.json();
  return data.artifacts;
}

// ============================================
// OAuth Device Flow
// ============================================

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export function getStoredClientId(): string {
  return localStorage.getItem(CLIENT_ID_KEY) || DEFAULT_CLIENT_ID;
}

export function storeClientId(clientId: string): void {
  localStorage.setItem(CLIENT_ID_KEY, clientId);
}

// Step 1: Request device code
export async function requestDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
  const response = await fetch(GITHUB_DEVICE_AUTH, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: 'repo workflow',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || 'Failed to request device code');
  }

  return response.json();
}

// Step 2: Poll for access token
export async function pollForToken(
  clientId: string,
  deviceCode: string,
  interval: number,
  onPoll?: () => void
): Promise<string> {
  const pollInterval = Math.max(interval, 5) * 1000; // GitHub requires minimum 5 seconds

  return new Promise((resolve, reject) => {
    const poll = async () => {
      onPoll?.();

      try {
        const response = await fetch(GITHUB_OAUTH_TOKEN, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        });

        const data = await response.json();

        if (data.access_token) {
          resolve(data.access_token);
          return;
        }

        if (data.error === 'authorization_pending') {
          // User hasn't authorized yet, keep polling
          setTimeout(poll, pollInterval);
          return;
        }

        if (data.error === 'slow_down') {
          // Slow down polling
          setTimeout(poll, pollInterval + 5000);
          return;
        }

        if (data.error === 'expired_token') {
          reject(new Error('Authorization expired. Please try again.'));
          return;
        }

        if (data.error === 'access_denied') {
          reject(new Error('Authorization denied by user.'));
          return;
        }

        reject(new Error(data.error_description || data.error || 'Unknown error'));
      } catch (err) {
        reject(err);
      }
    };

    poll();
  });
}

// Full OAuth flow
export async function startOAuthFlow(
  clientId: string,
  onDeviceCode: (response: DeviceCodeResponse) => void,
  onPoll?: () => void
): Promise<{ token: string; user: GitHubUser }> {
  // Step 1: Get device code
  const deviceCodeResponse = await requestDeviceCode(clientId);
  onDeviceCode(deviceCodeResponse);

  // Step 2: Poll for token
  const token = await pollForToken(
    clientId,
    deviceCodeResponse.device_code,
    deviceCodeResponse.interval,
    onPoll
  );

  // Step 3: Get user info
  const user = await verifyToken(token);

  // Store credentials
  storeToken(token);
  storeUser(user);
  storeClientId(clientId);

  return { token, user };
}
