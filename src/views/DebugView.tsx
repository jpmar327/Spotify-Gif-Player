import { useEffect, useState, useCallback } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getApiLog, type ApiLogEntry } from '../lib/store';

function highlightJson(json: string): string {
  return json.replace(
    /("(?:\\.|[^"\\])*"(\s*:)?|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match) && /:$/.test(match))
        return `<span style="color:#9cdcfe">${match}</span>`;
      if (/^"/.test(match))
        return `<span style="color:#ce9178">${match}</span>`;
      if (match === 'true' || match === 'false')
        return `<span style="color:#569cd6">${match}</span>`;
      if (match === 'null')
        return `<span style="color:#808080">${match}</span>`;
      return `<span style="color:#b5cea8">${match}</span>`;
    }
  );
}

function statusColor(status: number | null): string {
  if (status === null) return '#e24b4a';
  if (status >= 200 && status < 300) return '#1DB954';
  if (status >= 400 && status < 500) return '#EF9F27';
  return '#e24b4a';
}

function ApiCard({ entry }: { entry: ApiLogEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      backgroundColor: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', cursor: 'pointer',
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{
          flexShrink: 0,
          fontSize: '0.7rem', fontWeight: 700,
          color: statusColor(entry.status),
          minWidth: 34,
        }}>
          {entry.status ?? 'ERR'}
        </span>

        <span style={{
          flex: 1, fontSize: '0.82rem', fontWeight: 600,
          color: 'rgba(255,255,255,0.85)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entry.label}
        </span>

        <span style={{
          flexShrink: 0,
          fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)',
        }}>
          {entry.durationMs}ms
        </span>

        <span style={{
          flexShrink: 0, fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.3)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 150ms ease',
        }}>▼</span>
      </div>

      {/* Expanded content */}
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.35)',
            fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
            wordBreak: 'break-all',
            marginBottom: 10,
            padding: '6px 10px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 6,
          }}>
            {entry.method} {entry.url}
          </div>

          <div style={{
            fontSize: '0.63rem', color: 'rgba(255,255,255,0.25)',
            marginBottom: 10,
          }}>
            {new Date(entry.requestedAt).toLocaleTimeString()}
          </div>

          <pre
            dangerouslySetInnerHTML={{
              __html: highlightJson(
                typeof entry.response === 'string'
                  ? entry.response
                  : JSON.stringify(entry.response, null, 2)
              ),
            }}
            style={{
              margin: 0, padding: '12px 14px',
              backgroundColor: '#1a1a1a', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
              fontSize: '0.68rem', lineHeight: 1.6,
              overflowX: 'auto', color: '#d4d4d4',
              whiteSpace: 'pre', maxHeight: 400, overflowY: 'auto',
            }}
          />
        </div>
      )}
    </div>
  );
}

export function DebugView() {
  const [entries, setEntries] = useState<ApiLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const log = await getApiLog();
      setEntries(log);
    } catch {
      setEntries([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadData();
    setLoading(false);
  }, [loadData]);

  // Initial load
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Silent background poll — fallback for entries written before window opened
  useEffect(() => {
    const id = setInterval(() => { void loadData(); }, 2000);
    return () => clearInterval(id);
  }, [loadData]);

  // Real-time push: main window emits this event on every log write/clear
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    void listen<ApiLogEntry[]>('api-log-updated', (event) => {
      setEntries(event.payload);
      setLoading(false);
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      backgroundColor: '#111', color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>API Debug</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            {entries.length} call{entries.length !== 1 ? 's' : ''} · current track
          </div>
        </div>
        <button
          onClick={() => { void refresh(); }}
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '6px 14px',
            color: 'rgba(255,255,255,0.65)',
            fontSize: '0.75rem', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.13)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px' }}>
        {loading && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textAlign: 'center', padding: '40px 0' }}>
            Loading…
          </div>
        )}
        {!loading && entries.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textAlign: 'center', padding: '40px 0' }}>
            No API calls logged yet. Play a track and change songs.
          </div>
        )}
        {!loading && entries.map((entry) => (
          <ApiCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
