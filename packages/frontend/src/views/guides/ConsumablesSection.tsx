import type { Consumable } from '../../data/guides/types';
import { CONSUMABLE_TYPE_LABELS } from '../../data/guides/types';

interface Props {
  consumables: Consumable[];
}

export function ConsumablesSection({ consumables }: Props) {
  return (
    <div className="space-y-2">
      {consumables.map((item, i) => {
        const typeLabel = CONSUMABLE_TYPE_LABELS[item.type];
        const label = item.subType
          ? `${typeLabel} (${item.subType})`
          : typeLabel;

        return (
          <div key={i} className="flex items-start gap-3 bg-gray-800 rounded px-3 py-2">
            <span className="flex-shrink-0 w-36 text-xs text-gray-500 uppercase tracking-wide pt-0.5">
              {label}
            </span>
            <div>
              <span className="text-white text-sm">{item.name}</span>
              {item.note && (
                <span className="ml-2 text-xs text-gray-500">({item.note})</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
