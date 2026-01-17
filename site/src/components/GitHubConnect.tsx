import { useState, useEffect } from 'react';
import { Github, LogOut, Check, AlertCircle, Loader2, ExternalLink, Copy } from 'lucide-react';
import {
  getStoredToken,
  getStoredUser,
  getStoredClientId,
  storeToken,
  storeUser,
  storeClientId,
  clearToken,
  verifyToken,
  checkRepoAccess,
  startOAuthFlow,
  type GitHubUser,
  type DeviceCodeResponse,
} from '../utils/github';
import { useStore } from '../store/useStore';

type AuthMode = 'select' | 'oauth' | 'pat' | 'oauth-pending';

export function GitHubConnect() {
  const { settings } = useStore();
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [hasRepoAccess, setHasRepoAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('select');
  const [error, setError] = useState<string | null>(null);

  // OAuth state
  const [clientId, setClientId] = useState(getStoredClientId());
  const [deviceCode, setDeviceCode] = useState<DeviceCodeResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // PAT state
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    checkConnection();
  }, [settings.githubOwner, settings.githubRepo]);

  const checkConnection = async () => {
    setIsLoading(true);
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      try {
        const verifiedUser = await verifyToken(token);
        setUser(verifiedUser);
        storeUser(verifiedUser);
        setIsConnected(true);

        const access = await checkRepoAccess(settings.githubOwner, settings.githubRepo);
        setHasRepoAccess(access);
      } catch {
        clearToken();
        setIsConnected(false);
        setUser(null);
      }
    } else {
      setIsConnected(false);
      setUser(null);
    }
    setIsLoading(false);
  };

  const handleOAuthLogin = async () => {
    if (!clientId.trim()) {
      setError('Please enter your OAuth App Client ID');
      return;
    }

    setError(null);
    setAuthMode('oauth-pending');

    try {
      const result = await startOAuthFlow(
        clientId.trim(),
        (response) => {
          setDeviceCode(response);
          // Auto-open GitHub in new tab
          window.open(response.verification_uri, '_blank');
        }
      );

      setUser(result.user);
      setIsConnected(true);
      setAuthMode('select');
      setDeviceCode(null);

      const access = await checkRepoAccess(settings.githubOwner, settings.githubRepo);
      setHasRepoAccess(access);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
      setAuthMode('oauth');
    }
  };

  const handlePATLogin = async () => {
    if (!tokenInput.trim()) {
      setError('Please enter a token');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const verifiedUser = await verifyToken(tokenInput.trim());
      storeToken(tokenInput.trim());
      storeUser(verifiedUser);
      setUser(verifiedUser);
      setIsConnected(true);
      setAuthMode('select');
      setTokenInput('');

      const access = await checkRepoAccess(settings.githubOwner, settings.githubRepo);
      setHasRepoAccess(access);

      if (!access) {
        setError(`Token doesn't have access to ${settings.githubOwner}/${settings.githubRepo}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify token');
    }

    setIsLoading(false);
  };

  const handleDisconnect = () => {
    clearToken();
    setIsConnected(false);
    setUser(null);
    setHasRepoAccess(false);
    setAuthMode('select');
  };

  const handleCopyCode = () => {
    if (deviceCode) {
      navigator.clipboard.writeText(deviceCode.user_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cancelOAuth = () => {
    setAuthMode('select');
    setDeviceCode(null);
    setError(null);
  };

  if (isLoading && authMode === 'select') {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-pve-accent" />
          <span className="text-gray-400">Checking GitHub connection...</span>
        </div>
      </div>
    );
  }

  // Connected state
  if (isConnected && user) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar_url}
              alt={user.login}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-medium text-white">{user.name || user.login}</p>
              <p className="text-sm text-gray-400">@{user.login}</p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-white/10">
          {hasRepoAccess ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              Connected to {settings.githubOwner}/{settings.githubRepo}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              No access to {settings.githubOwner}/{settings.githubRepo}
            </div>
          )}
        </div>
      </div>
    );
  }

  // OAuth pending - waiting for user to authorize
  if (authMode === 'oauth-pending' && deviceCode) {
    return (
      <div className="glass-card p-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-pve-accent/20 rounded-full mb-4">
            <Github className="w-8 h-8 text-pve-accent" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Authorize on GitHub</h3>
          <p className="text-gray-400 mb-4">Enter this code at GitHub:</p>

          <div className="flex items-center justify-center gap-2 mb-4">
            <code className="text-3xl font-mono font-bold text-pve-accent bg-black/30 px-4 py-2 rounded-lg tracking-wider">
              {deviceCode.user_code}
            </code>
            <button
              onClick={handleCopyCode}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Copy code"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>

          <a
            href={deviceCode.verification_uri}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2 mb-4"
          >
            <ExternalLink className="w-4 h-4" />
            Open GitHub
          </a>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Waiting for authorization...
          </div>

          <button onClick={cancelOAuth} className="text-sm text-gray-400 hover:text-white">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Auth mode selection / OAuth setup
  if (authMode === 'select' || authMode === 'oauth') {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <Github className="w-6 h-6 text-white" />
          <div>
            <p className="font-medium text-white">Connect GitHub</p>
            <p className="text-sm text-gray-400">Push profiles and trigger builds directly</p>
          </div>
        </div>

        {authMode === 'select' && (
          <div className="space-y-3">
            <button
              onClick={() => setAuthMode('oauth')}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Github className="w-5 h-5" />
              Login with GitHub (OAuth)
            </button>
            <button
              onClick={() => setAuthMode('pat')}
              className="btn-secondary w-full text-sm"
            >
              Use Personal Access Token instead
            </button>
          </div>
        )}

        {authMode === 'oauth' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
              <p className="text-blue-200 mb-2">
                <strong>One-time setup:</strong> Create a GitHub OAuth App to enable login.
              </p>
              <a
                href="https://github.com/settings/applications/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pve-accent hover:underline inline-flex items-center gap-1"
              >
                Create OAuth App
                <ExternalLink className="w-3 h-3" />
              </a>
              <ul className="mt-2 text-gray-400 text-xs space-y-1">
                <li>• Application name: <code className="bg-black/30 px-1 rounded">Proxmox Deployer</code></li>
                <li>• Homepage URL: <code className="bg-black/30 px-1 rounded">https://{settings.githubOwner}.github.io/{settings.githubRepo}</code></li>
                <li>• Callback URL: <code className="bg-black/30 px-1 rounded">https://github.com/login/oauth/authorize</code></li>
                <li>• Enable Device Flow: <strong className="text-blue-300">Yes (check the box)</strong></li>
              </ul>
            </div>

            <div>
              <label className="form-label">OAuth App Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  storeClientId(e.target.value);
                }}
                placeholder="Ov23li..."
                className="form-input font-mono"
              />
            </div>

            {error && (
              <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAuthMode('select');
                  setError(null);
                }}
                className="btn-secondary flex-1"
              >
                Back
              </button>
              <button
                onClick={handleOAuthLogin}
                disabled={!clientId.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Github className="w-4 h-4" />
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PAT mode
  if (authMode === 'pat') {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <Github className="w-6 h-6 text-white" />
          <div>
            <p className="font-medium text-white">Connect with Token</p>
            <p className="text-sm text-gray-400">Use a Personal Access Token</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="form-label">Personal Access Token</label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="form-input font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handlePATLogin()}
            />
            <p className="text-xs text-gray-500 mt-1">
              Create at{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=Proxmox%20Deployer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pve-accent hover:underline"
              >
                github.com/settings/tokens
              </a>
              {' '}with <code className="bg-black/30 px-1 rounded">repo</code> + <code className="bg-black/30 px-1 rounded">workflow</code> scopes.
            </p>
          </div>

          {error && (
            <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setAuthMode('select');
                setTokenInput('');
                setError(null);
              }}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              onClick={handlePATLogin}
              disabled={isLoading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Connect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
