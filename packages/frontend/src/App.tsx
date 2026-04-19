import { useAppStore, type View } from './store/useAppStore';
import { CharactersView } from './views/CharactersView';
import { TrackerView } from './views/TrackerView';

const NAV_TABS: { view: View; label: string }[] = [
  { view: 'tracker',    label: 'Tracker' },
  { view: 'characters', label: 'Characters' },
  { view: 'profiles',   label: 'Profiles' },
  { view: 'settings',   label: 'Settings' },
];

export default function App() {
  const { activeView, setActiveView } = useAppStore();

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
        {activeView === 'profiles'   && <div className="p-8 text-gray-400">Profiles — coming in Phase 5</div>}
        {activeView === 'settings'   && <div className="p-8 text-gray-400">Settings — coming in Phase 6</div>}
      </main>
    </div>
  );
}
