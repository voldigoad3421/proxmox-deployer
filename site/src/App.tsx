import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { Header } from './components/Header';
import { TabNav } from './components/TabNav';
import { ProfilesTab } from './components/ProfilesTab';
import { BuildTab } from './components/BuildTab';
import { NetbootTab } from './components/NetbootTab';
import { SettingsTab } from './components/SettingsTab';
import { ProfileModal } from './components/ProfileModal';

function App() {
  const { loadInitialData, activeTab, currentProfile, isEditing, setCurrentProfile, setIsEditing } = useStore();

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleCloseModal = () => {
    setCurrentProfile(null);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <TabNav />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {activeTab === 'profiles' && <ProfilesTab />}
        {activeTab === 'build' && <BuildTab />}
        {activeTab === 'netboot' && <NetbootTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      {(currentProfile || isEditing) && (
        <ProfileModal onClose={handleCloseModal} />
      )}

      <footer className="py-4 text-center text-sm text-gray-500 border-t border-white/10">
        <p>
          Proxmox Deployer - Built with React + Vite |{' '}
          <a
            href="https://pve.proxmox.com/wiki/Automated_Installation"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pve-accent hover:underline"
          >
            Proxmox Auto-Install Docs
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
