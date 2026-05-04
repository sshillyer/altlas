import { useState } from 'react';
import type { TalentLoadout } from '../../data/guides/types';

interface Props {
  loadouts: TalentLoadout[];
}

export function TalentBuildSection({ loadouts }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(label: string, exportString: string) {
    if (!exportString) return;
    navigator.clipboard.writeText(exportString).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="space-y-4">
      {loadouts.map((loadout) => (
        <div key={loadout.label} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-white">{loadout.label}</span>
            <button
              onClick={() => copy(loadout.label, loadout.exportString)}
              disabled={!loadout.exportString}
              title={loadout.exportString ? 'Copy talent string' : 'No export string yet'}
              className={`text-xs px-3 py-1 rounded transition-colors ${
                loadout.exportString
                  ? copied === loadout.label
                    ? 'bg-green-700 text-green-100'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
              }`}
            >
              {copied === loadout.label ? 'Copied!' : 'Copy Export String'}
            </button>
          </div>
          {loadout.description && (
            <p className="text-sm text-gray-400">{loadout.description}</p>
          )}
          {loadout.exportString ? (
            <code className="mt-2 block text-xs text-gray-500 bg-gray-900 rounded px-2 py-1 truncate">
              {loadout.exportString}
            </code>
          ) : (
            <p className="mt-2 text-xs text-gray-600 italic">Export string not yet added.</p>
          )}
        </div>
      ))}
    </div>
  );
}
