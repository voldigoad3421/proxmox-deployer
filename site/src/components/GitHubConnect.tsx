import { useState, useEffect } from 'react';
import { Github, LogOut, Check, AlertCircle, Loader2 } from 'lucide-react';
import {
  getStoredToken,
  getStoredUser,
  storeToken,
  storeUser,
  clearToken,
  verifyToken,
  checkRepoAccess,
  type GitHubUser,
} from '../utils/github';
import { useStore } from '../store/useStore';

export function GitHubConnect() {
  const { settings } = useStore();
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [hasRepoAccess, setHasRepoAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const handleConnect = async () => {
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
  };

  if (isLoading && !tokenInput) {
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

  // Not connected - show token input
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3 mb-4">
        <Github className="w-6 h-6 text-white" />
        <div>
          <p className="font-medium text-white">Connect GitHub</p>
          <p className="text-sm text-gray-400">Push profiles and trigger builds directly</p>
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
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
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

        <button
          onClick={handleConnect}
          disabled={isLoading || !tokenInput.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Github className="w-4 h-4" />
          )}
          Connect
        </button>
      </div>
    </div>
  );
}
