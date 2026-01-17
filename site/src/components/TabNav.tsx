import { Server, Hammer, Wifi, Settings } from 'lucide-react';
import { useStore } from '../store/useStore';

const tabs = [
  { id: 'profiles' as const, label: 'Node Profiles', icon: Server },
  { id: 'build' as const, label: 'Build ISOs', icon: Hammer },
  { id: 'netboot' as const, label: 'Netboot / iPXE', icon: Wifi },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export function TabNav() {
  const { activeTab, setActiveTab, profiles, selectedProfiles } = useStore();

  return (
    <nav className="border-b border-white/10 bg-white/5">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'profiles' ? profiles.length :
                         tab.id === 'build' ? selectedProfiles.length : null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors
                  ${isActive
                    ? 'border-pve-accent text-pve-accent'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-white/30'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {count !== null && count > 0 && (
                  <span className={`
                    ml-1 px-2 py-0.5 text-xs rounded-full
                    ${isActive ? 'bg-pve-accent/20' : 'bg-white/10'}
                  `}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
