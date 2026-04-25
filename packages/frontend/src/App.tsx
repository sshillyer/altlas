import { useEffect, useState } from 'react';
import { useAppStore, type View } from './store/useAppStore';
import { CharactersView } from './views/CharactersView';
import { TrackerView } from './views/TrackerView';
import { ProfilesView } from './views/ProfilesView';
import { SettingsView } from './views/SettingsView';
import { CharacterDashboardPanel } from './views/CharacterDashboardPanel';
import { api } from './api/client';
import type { Character } from './types';

const NAV_TABS: { view: View; label: string }[] = [
  { view: 'tracker',    label: 'Tracker' },
  { view: 'characters', label: 'Characters' },
  { view: 'profiles',   label: 'Profiles' },
  { view: 'settings',   label: 'Settings' },
];

export default function App() {
  const { activeView, setActiveView, setActiveProfile, setProfiles, setBnetStatus } = useAppStore();
  const [dashboardChar, setDashboardChar] = useState<Character | null>(null);

  useEffect(() => {
    // Handle OAuth callback redirect: ?bnetAuth=success|error
    const params = new URLSearchParams(window.location.search);
    const bnetAuth = params.get('bnetAuth');
    if (bnetAuth) {
      // Clear the query param without a page reload
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
      // Navigate to settings so the user sees their connection status
      setActiveView('settings');
    }

    Promise.all([api.settings.get(), api.profiles.list(), api.auth.status()]).then(
      ([settings, profileList, authStatus]) => {
        setProfiles(profileList);
        setActiveProfile(settings['active_profile_id'] ?? null);
        setBnetStatus(authStatus.available, authStatus.connected);
      },
    ).catch(console.error);
  }, [setActiveProfile, setProfiles, setBnetStatus, setActiveView]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-700 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-lg tracking-tight text-white">Altlas</span>
        <nav className="flex gap-1">
          {NAV_TABS.map(({ view, label }) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                activeView === view
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {activeView === 'tracker'    && <TrackerView onCharacterClick={setDashboardChar} />}
        {activeView === 'characters' && <CharactersView onCharacterClick={setDashboardChar} />}
        {activeView === 'profiles'   && <ProfilesView />}
        {activeView === 'settings'   && <SettingsView />}
      </main>

      {dashboardChar && (
        <CharacterDashboardPanel
          character={dashboardChar}
          onClose={() => setDashboardChar(null)}
        />
      )}
    </div>
  );
}
