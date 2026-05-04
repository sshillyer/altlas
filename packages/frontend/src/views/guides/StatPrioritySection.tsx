import type { StatPriorityEntry } from '../../data/guides/types';

interface Props {
  stats: StatPriorityEntry[];
}

export function StatPrioritySection({ stats }: Props) {
  return (
    <ol className="space-y-2">
      {stats.map((entry, i) => (
        <li key={entry.stat} className="flex items-start gap-3">
          <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-amber-400">
            {i + 1}
          </span>
          <div>
            <span className="font-medium text-white">{entry.stat}</span>
            {entry.note && (
              <span className="ml-2 text-sm text-gray-400">— {entry.note}</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
