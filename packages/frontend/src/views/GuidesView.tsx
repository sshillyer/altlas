import { useEffect, useState } from 'react';
import { CLASS_GUIDES, GUIDE_CLASS_LIST } from '../data/guides';
import { CLASS_COLORS } from '../types';
import type { WowClass } from '../types';
import { useAppStore } from '../store/useAppStore';
import { ClassGuideView } from './ClassGuideView';

export function GuidesView() {
  const { pendingGuideClass, clearPendingGuideClass } = useAppStore();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    if (pendingGuideClass) {
      setSelectedClass(pendingGuideClass);
      clearPendingGuideClass();
    }
  }, [pendingGuideClass, clearPendingGuideClass]);

  if (selectedClass) {
    const guide = CLASS_GUIDES[selectedClass];
    if (guide) {
      return <ClassGuideView guide={guide} onBack={() => setSelectedClass(null)} />;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold text-white mb-2">Class Guides</h1>
      <p className="text-gray-400 text-sm mb-6">
        Quick-reference guides for talents, stat priority, consumables, and enchants.
        Currently covering Warlock — more classes coming soon.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {GUIDE_CLASS_LIST.map(({ wowClass, label }) => {
          const hasGuide = !!CLASS_GUIDES[wowClass];
          const color = CLASS_COLORS[wowClass as WowClass] ?? '#9ca3af';

          return (
            <button
              key={wowClass}
              onClick={() => hasGuide ? setSelectedClass(wowClass) : undefined}
              disabled={!hasGuide}
              className={`relative rounded-lg px-4 py-5 text-left border transition-all ${
                hasGuide
                  ? 'border-gray-700 bg-gray-800 hover:border-gray-500 hover:bg-gray-750 cursor-pointer'
                  : 'border-gray-800 bg-gray-850 cursor-not-allowed opacity-40'
              }`}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: hasGuide ? color : '#6b7280' }}
              >
                {label}
              </div>
              {hasGuide ? (
                <div className="mt-1 text-xs text-gray-400">
                  {CLASS_GUIDES[wowClass].specs.map((s) => s.specName).join(' · ')}
                </div>
              ) : (
                <div className="mt-1 text-xs text-gray-600">Coming soon</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
