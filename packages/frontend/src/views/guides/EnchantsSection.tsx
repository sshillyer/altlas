import type { Enchant, Gem } from '../../data/guides/types';

interface Props {
  enchants: Enchant[];
  gems: Gem[];
}

export function EnchantsSection({ enchants, gems }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Enchants</h3>
        <div className="space-y-2">
          {enchants.map((item) => (
            <div key={item.slot} className="flex items-start gap-3 bg-gray-800 rounded px-3 py-2">
              <span className="flex-shrink-0 w-24 text-xs text-gray-500 uppercase tracking-wide pt-0.5">
                {item.slot}
              </span>
              <div>
                <span className="text-white text-sm">{item.name}</span>
                {item.note && (
                  <span className="ml-2 text-xs text-gray-500">({item.note})</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {gems.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Gems</h3>
          <div className="space-y-2">
            {gems.map((item) => (
              <div key={item.socketType} className="flex items-start gap-3 bg-gray-800 rounded px-3 py-2">
                <span className="flex-shrink-0 w-24 text-xs text-gray-500 uppercase tracking-wide pt-0.5">
                  {item.socketType}
                </span>
                <div>
                  <span className="text-white text-sm">{item.name}</span>
                  {item.note && (
                    <span className="ml-2 text-xs text-gray-500">({item.note})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
