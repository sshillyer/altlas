import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { useTrackerStore } from '../store/useTrackerStore';

const REGIONS = ['us', 'eu', 'kr', 'tw'] as const;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function formatRelative(iso: string): string {
  const delta = new Date(iso).getTime() - Date.now();
  if (delta <= 0) return 'expired';
  const h = Math.floor(delta / 3_600_000);
  const m = Math.floor((delta % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function SettingsView() {
  const { bnetAvailable, bnetConnected, setBnetStatus } = useAppStore();
  const { fetchTracker } = useTrackerStore();

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [resetLog, setResetLog] = useState<Array<{
    id: string; resetType: string; region: string;
    scheduledAt: string; executedAt: string; rowsAffected: number;
  }>>([]);
  const [connectingBnet, setConnectingBnet] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.settings.get(),
      api.auth.status(),
      api.resets.log(),
    ]).then(([s, auth, log]) => {
      setSettings(s);
      setBnetStatus(auth.available, auth.connected);
      setExpiresAt(auth.expiresAt ?? null);
      setResetLog(log.slice(0, 10));
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [setBnetStatus]);

  async function handleRegionChange(region: string) {
    const updated = await api.settings.update({ region });
    setSettings(updated);
    fetchTracker().catch(console.error);
  }

  async function handleConnectBnet() {
    setConnectingBnet(true);
    try {
      const res = await api.auth.getBnetUrl();
      if (res.available && res.url) {
        window.location.href = res.url;
      }
    } catch (e) {
      console.error(e);
      setConnectingBnet(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await api.auth.disconnect();
      setBnetStatus(bnetAvailable, false);
      setExpiresAt(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleTriggerReset(type: 'daily' | 'weekly') {
    setTriggerStatus(`Triggering ${type} reset…`);
    try {
      await api.resets.trigger(type);
      const log = await api.resets.log();
      setResetLog(log.slice(0, 10));
      setTriggerStatus(`${type.charAt(0).toUpperCase() + type.slice(1)} reset triggered.`);
      fetchTracker().catch(console.error);
    } catch (e) {
      setTriggerStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    setTimeout(() => setTriggerStatus(null), 4000);
  }

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;

  const currentRegion = settings['region'] ?? 'us';
  const lastSync = settings['last_bnet_sync'] ?? null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h2 className="text-xl font-bold text-white">Settings</h2>

      {/* Region */}
      <section className="bg-gray-800 rounded p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Region</h3>
        <div className="flex gap-2">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => handleRegionChange(r)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                currentRegion === r
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">Controls which reset times are used for the tracker.</p>
      </section>

      {/* Battle.net */}
      {bnetAvailable && (
        <section className="bg-gray-800 rounded p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Battle.net</h3>

          <div className="flex items-center gap-3">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                bnetConnected ? 'bg-green-400' : 'bg-gray-500'
              }`}
            />
            <span className="text-sm text-gray-200">
              {bnetConnected ? 'Connected' : 'Not connected'}
            </span>
            {bnetConnected && expiresAt && (
              <span className="text-xs text-gray-500">
                (expires in {formatRelative(expiresAt)})
              </span>
            )}
          </div>

          {bnetConnected ? (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">
                Last sync: {formatDate(lastSync)}
              </p>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-1.5 bg-gray-700 hover:bg-red-700 disabled:opacity-50 rounded text-sm text-gray-300 hover:text-white transition-colors"
              >
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectBnet}
              disabled={connectingBnet}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm text-white font-medium transition-colors"
            >
              {connectingBnet ? 'Redirecting…' : 'Connect Battle.net'}
            </button>
          )}
        </section>
      )}

      {/* Dev tools */}
      {import.meta.env.DEV && (
        <section className="bg-gray-800 rounded p-4 space-y-3 border border-yellow-800/40">
          <h3 className="text-sm font-semibold text-yellow-500 uppercase tracking-wide">
            Dev Tools
          </h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleTriggerReset('daily')}
              className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 rounded text-sm text-white"
            >
              Trigger Daily Reset
            </button>
            <button
              onClick={() => handleTriggerReset('weekly')}
              className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 rounded text-sm text-white"
            >
              Trigger Weekly Reset
            </button>
          </div>
          {triggerStatus && (
            <p className="text-xs text-yellow-300">{triggerStatus}</p>
          )}
        </section>
      )}

      {/* Reset log */}
      <section className="bg-gray-800 rounded p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Reset Log</h3>
        {resetLog.length === 0 ? (
          <p className="text-xs text-gray-500">No resets recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-500 border-b border-gray-700">
                  <th className="pb-1 pr-4 font-medium">Type</th>
                  <th className="pb-1 pr-4 font-medium">Region</th>
                  <th className="pb-1 pr-4 font-medium">Executed</th>
                  <th className="pb-1 font-medium">Rows</th>
                </tr>
              </thead>
              <tbody>
                {resetLog.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-700/50">
                    <td className="py-1 pr-4 text-gray-300 capitalize">{entry.resetType}</td>
                    <td className="py-1 pr-4 text-gray-400 uppercase">{entry.region}</td>
                    <td className="py-1 pr-4 text-gray-400">{formatDate(entry.executedAt)}</td>
                    <td className="py-1 text-gray-400">{entry.rowsAffected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
