import { Server, Github } from 'lucide-react';
import { useStore } from '../store/useStore';

export function Header() {
  const { settings } = useStore();

  return (
    <header className="glass-card rounded-none border-x-0 border-t-0">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pve-accent/20 rounded-lg">
              <Server className="w-8 h-8 text-pve-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Proxmox Deployer</h1>
              <p className="text-sm text-gray-400">Automated ISO Builder & Netboot Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={`https://github.com/${settings.githubOwner}/${settings.githubRepo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Github className="w-5 h-5" />
              <span className="hidden sm:inline">Repository</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
