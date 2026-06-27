import { useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import type { NowPlaying } from '../lib/spotify';

interface StoredMeta {
  track: NowPlaying;
  genre: string | null;
}

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtDate(raw: string): string {
  if (!raw) return 'Unknown';
  if (raw.length === 4) return raw;
  try {
    return new Date(raw).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return raw;
  }
}

function Bar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#1DB954', borderRadius: 2 }} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.88rem' }}>{value}</div>
    </div>
  );
}

export function MetadataView() {
  const [meta, setMeta] = useState<StoredMeta | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gif-player-meta');
      if (raw) setMeta(JSON.parse(raw) as StoredMeta);
    } catch {
      // ignore
    }
  }, []);

  if (!meta) {
    return (
      <div style={{
        width: '100vw', height: '100vh', backgroundColor: '#111',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.35)', fontFamily: 'system-ui',
      }}>
        No track data — open the player and click ℹ
      </div>
    );
  }

  const { track, genre } = meta;

  return (
    <div style={{
      width: '100vw', height: '100vh', backgroundColor: '#111',
      color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif',
      overflowY: 'auto', overflowX: 'hidden',
    }}>

      {/* Blurred album-art banner */}
      <div style={{ position: 'relative', height: 170, flexShrink: 0, overflow: 'hidden' }}>
        {track.albumArt && (
          <img
            src={track.albumArt}
            alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', filter: 'blur(22px) brightness(0.35)', transform: 'scale(1.15)',
            }}
          />
        )}
        {/* Floating album art thumbnail */}
        {track.albumArt && (
          <img
            src={track.albumArt}
            alt="Album art"
            style={{
              position: 'absolute', bottom: -28, left: 22, width: 96, height: 96,
              borderRadius: 8, objectFit: 'cover', boxShadow: '0 8px 28px rgba(0,0,0,0.65)',
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '44px 24px 32px' }}>

        {/* Title + artist */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
          {track.explicit && (
            <span style={{
              flexShrink: 0, marginTop: 5,
              fontSize: '0.58rem', backgroundColor: 'rgba(255,255,255,0.25)',
              borderRadius: 2, padding: '2px 5px', letterSpacing: '0.04em',
            }}>
              EXPLICIT
            </span>
          )}
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, lineHeight: 1.2 }}>
            {track.trackName}
          </h1>
        </div>

        <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.68)', marginBottom: 2 }}>
          {track.artistName}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.42)', marginBottom: 22 }}>
          {track.albumName}
        </div>

        {/* Metadata grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px', marginBottom: 22 }}>
          <Row label="Duration"  value={fmtDuration(track.durationMs)} />
          <Row label="Released"  value={fmtDate(track.albumReleaseDate)} />
          <Row label="Track"     value={`#${track.trackNumber}`} />
          <Row label="Genre"     value={genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : '—'} />
        </div>

        {/* Popularity */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 7 }}>
            Popularity · {track.popularity} / 100
          </div>
          <Bar value={track.popularity} />
        </div>

        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 22 }} />

        {/* Open in Spotify */}
        {track.externalUrl && (
          <button
            onClick={() => { void open(track.externalUrl); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              backgroundColor: '#1DB954', color: '#000',
              border: 'none', borderRadius: 500,
              padding: '10px 22px',
              fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1ed760')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1DB954')}
          >
            Open in Spotify ↗
          </button>
        )}
      </div>
    </div>
  );
}
