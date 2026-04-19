import { useEffect } from 'react';
import { useAppStore, type View } from './store/useAppStore';
import { CharactersView } from './views/CharactersView';
import { TrackerView } from './views/TrackerView';
import { ProfilesView } from './views/ProfilesView';
import { api } from './api/client';

const NAV_TABS: { view: View; label: string }[] = [
  { view: 'tracker',    label: 'Tracker' },
  { view: 'characters', label: 'Characters' },
  { view: 'profiles',   label: 'Profiles' },
  { view: 'settings',   label: 'Settings' },
];

export default function App() {
  const { activeView, setActiveView, setActiveProfile, setProfiles } = useAppStore();

  useEffect(() => {
    Promise.all([api.settings.get(), api.profiles.list()]).then(([settings, profileList]) => {
      setProfiles(profileList);
      setActiveProfile(settings['active_profile_id'] ?? null);
    });
  }, [setActiveProfile, setProfiles]);

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
        {activeView === 'tracker'    && <TrackerView />}
        {activeView === 'characters' && <CharactersView />}
        {activeView === 'profiles'   && <ProfilesView />}
        {activeView === 'settings'   && <div className="p-8 text-gray-400">Settings — coming in Phase 6</div>}
      </main>
    </div>
  );
}
