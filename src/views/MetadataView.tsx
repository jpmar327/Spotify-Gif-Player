import { useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import type { NowPlaying, AudioFeatures, AudioAnalysis } from '../lib/spotify';
import { getTrackMeta, getApiLog, type ApiLogEntry } from '../lib/store';

interface StoredMeta {
  track: NowPlaying;
  genre: string | null;
  audioFeatures: AudioFeatures | null;
  audioAnalysis: AudioAnalysis | null;
}

// ── Shared helpers ───────────────────────────────────────────────

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function keyLabel(key: number, mode: number): string {
  if (key < 0) return 'Unknown';
  return `${KEY_NAMES[key]} ${mode === 1 ? 'Major' : 'Minor'}`;
}

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return s < 60 ? `${s.toFixed(1)}s` : `${m}:${String(sec).padStart(2, '0')}`;
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

// Hue per pitch class — maps to the color wheel so adjacent keys share similar hues
const KEY_HUE = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

function keyColor(key: number): string {
  if (key < 0) return 'rgba(255,255,255,0.15)';
  return `hsl(${KEY_HUE[key]}, 65%, 52%)`;
}

// ── Small UI components ──────────────────────────────────────────

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

function Bar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#1DB954', borderRadius: 2 }} />
    </div>
  );
}

function FeatureBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>{label}</span>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)' }}>{pct}%</span>
      </div>
      <div style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#1DB954', borderRadius: 2 }} />
      </div>
    </div>
  );
}

function ConfBar({ label, value, extra }: { label: string; value: number; extra?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>
          {label}{extra ? <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>{extra}</span> : null}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'rgba(100,180,255,0.7)', borderRadius: 2 }} />
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)',
      textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
    }}>
      {label}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', margin: '18px 0' }} />;
}

function JsonToggleButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        background: open ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 6,
        padding: '2px 8px',
        color: open ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
        fontSize: '0.68rem',
        fontWeight: 600,
        fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
        cursor: 'pointer',
        letterSpacing: '0.04em',
        lineHeight: 1.6,
        transition: 'background 120ms ease, color 120ms ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = open ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)')}
    >
      {open ? '{ ▲ }' : '{ }'}
    </button>
  );
}

function JsonPanel({ data, label }: { data: unknown; label: string }) {
  return (
    <div style={{ marginTop: 12, marginBottom: 4 }}>
      <div style={{
        fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8,
      }}>
        {label}
      </div>
      <pre
        dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(data, null, 2)) }}
        style={{
          margin: 0, padding: '12px 14px',
          backgroundColor: '#1a1a1a', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.08)',
          fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
          fontSize: '0.68rem', lineHeight: 1.6,
          overflowX: 'auto', color: '#d4d4d4', whiteSpace: 'pre',
        }}
      />
    </div>
  );
}

// ── API log helpers ──────────────────────────────────────────────

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
      marginBottom: 8,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, color: statusColor(entry.status), minWidth: 34 }}>
          {entry.status ?? 'ERR'}
        </span>
        <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.label}
        </span>
        <span style={{ flexShrink: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
          {entry.durationMs}ms
        </span>
        <span style={{ flexShrink: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }}>
          ▼
        </span>
      </div>

      {/* Expanded content */}
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          {/* URL */}
          <div style={{
            fontSize: '0.63rem',
            color: 'rgba(255,255,255,0.35)',
            fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
            wordBreak: 'break-all',
            marginBottom: 8,
            padding: '6px 10px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 6,
          }}>
            {entry.method} {entry.url}
          </div>
          {/* Timestamp */}
          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>
            {new Date(entry.requestedAt).toLocaleTimeString()}
          </div>
          {/* JSON response */}
          <pre
            dangerouslySetInnerHTML={{
              __html: highlightJson(
                typeof entry.response === 'string'
                  ? entry.response
                  : JSON.stringify(entry.response, null, 2)
              ),
            }}
            style={{
              margin: 0, padding: '10px 12px',
              backgroundColor: '#1a1a1a', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
              fontSize: '0.66rem', lineHeight: 1.6,
              overflowX: 'auto', color: '#d4d4d4',
              whiteSpace: 'pre', maxHeight: 360, overflowY: 'auto',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── JSON syntax highlighter ──────────────────────────────────────

const BASE_HEIGHT   = 820;
const JSON_EXTRA    = 400;
const JSON_PER_PANEL = 300;

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
    },
  );
}

// ── Main component ───────────────────────────────────────────────

export function MetadataView() {
  const [meta, setMeta] = useState<StoredMeta | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [showTrackJson, setShowTrackJson]       = useState(false);
  const [showFeaturesJson, setShowFeaturesJson] = useState(false);
  const [showAnalysisJson, setShowAnalysisJson] = useState(false);
  const [showApiLog, setShowApiLog] = useState(false);
  const [apiLog, setApiLog]         = useState<ApiLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    getTrackMeta()
      .then((data) => { if (data) setMeta(data as StoredMeta); })
      .catch(() => { /* ignore */ });
  }, []);

  async function resizeWindow(openCount: number) {
    try {
      const win = getCurrentWebviewWindow();
      await win.setSize(new LogicalSize(540, BASE_HEIGHT + openCount * JSON_PER_PANEL + (showJson ? JSON_EXTRA : 0)));
    } catch { /* scrollable fallback */ }
  }

  async function toggleJson() {
    const next = !showJson;
    setShowJson(next);
    const perSectionCount = [showTrackJson, showFeaturesJson, showAnalysisJson].filter(Boolean).length;
    try {
      const win = getCurrentWebviewWindow();
      await win.setSize(new LogicalSize(540, BASE_HEIGHT + perSectionCount * JSON_PER_PANEL + (next ? JSON_EXTRA : 0)));
    } catch { /* falls back to scrollable view */ }
  }

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

  const { track, genre, audioFeatures, audioAnalysis } = meta;

  return (
    <div style={{
      width: '100vw', height: '100vh', backgroundColor: '#111',
      color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif',
      overflowY: 'auto', overflowX: 'hidden',
    }}>

      {/* ── Blurred album-art banner ── */}
      <div style={{ position: 'relative', height: 170, flexShrink: 0, overflow: 'hidden' }}>
        {track.albumArt && (
          <img src={track.albumArt} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', filter: 'blur(22px) brightness(0.35)', transform: 'scale(1.15)',
          }} />
        )}
        {track.albumArt && (
          <img src={track.albumArt} alt="Album art" style={{
            position: 'absolute', bottom: -28, left: 22, width: 96, height: 96,
            borderRadius: 8, objectFit: 'cover', boxShadow: '0 8px 28px rgba(0,0,0,0.65)',
          }} />
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '44px 24px 32px' }}>

        {/* Title + artist */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
          {track.explicit && (
            <span style={{
              flexShrink: 0, marginTop: 5,
              fontSize: '0.58rem', backgroundColor: 'rgba(255,255,255,0.25)',
              borderRadius: 2, padding: '2px 5px', letterSpacing: '0.04em',
            }}>EXPLICIT</span>
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

        {/* ── Track Info section header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <SectionLabel label="Track Info" />
          <JsonToggleButton
            open={showTrackJson}
            onToggle={() => {
              const next = !showTrackJson;
              setShowTrackJson(next);
              void resizeWindow([next, showFeaturesJson, showAnalysisJson].filter(Boolean).length);
            }}
          />
        </div>

        {/* Metadata grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px', marginBottom: 22 }}>
          <Row label="Duration" value={fmtDuration(track.durationMs)} />
          <Row label="Released" value={fmtDate(track.albumReleaseDate)} />
          <Row label="Track"    value={`#${track.trackNumber}`} />
          <Row label="Genre"    value={genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : '—'} />
        </div>

        {/* Popularity */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 7 }}>
            Popularity · {track.popularity} / 100
          </div>
          <Bar value={track.popularity} />
        </div>

        {showTrackJson && <JsonPanel data={track} label="Spotify /me/player response" />}

        {/* ── Audio Features ── */}
        {audioFeatures && (
          <>
            <Divider />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <SectionLabel label="Audio Features" />
              <JsonToggleButton
                open={showFeaturesJson}
                onToggle={() => {
                  const next = !showFeaturesJson;
                  setShowFeaturesJson(next);
                  void resizeWindow([showTrackJson, next, showAnalysisJson].filter(Boolean).length);
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 16px', marginBottom: 16 }}>
              <Row label="Tempo"    value={`${Math.round(audioFeatures.tempo)} BPM`} />
              <Row label="Key"      value={keyLabel(audioFeatures.key, audioFeatures.mode)} />
              <Row label="Time Sig" value={`${audioFeatures.time_signature}/4`} />
              <Row label="Loudness" value={`${audioFeatures.loudness.toFixed(1)} dB`} />
            </div>

            <FeatureBar label="Energy"           value={audioFeatures.energy} />
            <FeatureBar label="Danceability"     value={audioFeatures.danceability} />
            <FeatureBar label="Valence (Mood)"   value={audioFeatures.valence} />
            <FeatureBar label="Acousticness"     value={audioFeatures.acousticness} />
            <FeatureBar label="Instrumentalness" value={audioFeatures.instrumentalness} />
            <FeatureBar label="Speechiness"      value={audioFeatures.speechiness} />
            <FeatureBar label="Liveness"         value={audioFeatures.liveness} />
            {showFeaturesJson && <JsonPanel data={audioFeatures} label="Spotify /audio-features response" />}
          </>
        )}

        {/* ── Audio Analysis ── */}
        {audioAnalysis && (
          <>
            <Divider />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <SectionLabel label="Audio Analysis" />
              <JsonToggleButton
                open={showAnalysisJson}
                onToggle={() => {
                  const next = !showAnalysisJson;
                  setShowAnalysisJson(next);
                  void resizeWindow([showTrackJson, showFeaturesJson, next].filter(Boolean).length);
                }}
              />
            </div>

            {/* Structure counts */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '8px 16px',
              marginBottom: 16,
            }}>
              {(
                [
                  ['Bars',     audioAnalysis.counts.bars],
                  ['Beats',    audioAnalysis.counts.beats],
                  ['Tatums',   audioAnalysis.counts.tatums],
                  ['Sections', audioAnalysis.counts.sections],
                  ['Segments', audioAnalysis.counts.segments],
                ] as [string, number][]
              ).map(([label, n]) => (
                <div key={label} style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: '5px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{n}</div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Fade in / fade out */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 16 }}>
              <Row label="Intro ends"    value={fmtSecs(audioAnalysis.track.end_of_fade_in)} />
              <Row label="Outro starts"  value={fmtSecs(audioAnalysis.track.start_of_fade_out)} />
              <Row label="Sample rate"   value={`${(audioAnalysis.track.analysis_sample_rate / 1000).toFixed(1)} kHz`} />
              <Row label="Samples"       value={audioAnalysis.track.num_samples.toLocaleString()} />
            </div>

            {/* Detection confidence */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>
                Detection Confidence
              </div>
              <ConfBar
                label="Tempo"
                value={audioAnalysis.track.tempo_confidence}
                extra={`${Math.round(audioAnalysis.track.tempo)} BPM`}
              />
              <ConfBar
                label="Key"
                value={audioAnalysis.track.key_confidence}
                extra={keyLabel(audioAnalysis.track.key, audioAnalysis.track.mode)}
              />
              <ConfBar
                label="Mode"
                value={audioAnalysis.track.mode_confidence}
                extra={audioAnalysis.track.mode === 1 ? 'Major' : 'Minor'}
              />
              <ConfBar
                label="Time Signature"
                value={audioAnalysis.track.time_signature_confidence}
                extra={`${audioAnalysis.track.time_signature}/4`}
              />
            </div>

            {/* Sections timeline */}
            {audioAnalysis.sections.length > 0 && (
              <div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8, }}>
                  Song Sections
                </div>
                <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
                  {audioAnalysis.sections.map((sec, i) => {
                    const widthPct = (sec.duration / audioAnalysis.track.duration) * 100;
                    return (
                      <div
                        key={i}
                        title={`${keyLabel(sec.key, sec.mode)} · ${Math.round(sec.tempo)} BPM · starts ${fmtSecs(sec.start)}`}
                        style={{
                          flex: `0 0 ${widthPct}%`,
                          backgroundColor: keyColor(sec.key),
                          opacity: 0.55 + sec.confidence * 0.45,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.55rem', fontWeight: 700,
                          color: 'rgba(0,0,0,0.75)', overflow: 'hidden',
                          cursor: 'default',
                        }}
                      >
                        {widthPct > 6 ? KEY_NAMES[Math.max(0, sec.key)] : ''}
                      </div>
                    );
                  })}
                </div>
                {/* Section timestamps below the timeline */}
                <div style={{ display: 'flex', marginTop: 4 }}>
                  {audioAnalysis.sections.map((sec, i) => {
                    const widthPct = (sec.duration / audioAnalysis.track.duration) * 100;
                    return (
                      <div
                        key={i}
                        style={{
                          flex: `0 0 ${widthPct}%`,
                          fontSize: '0.55rem', color: 'rgba(255,255,255,0.28)',
                          overflow: 'hidden', whiteSpace: 'nowrap',
                          paddingLeft: 2,
                        }}
                      >
                        {widthPct > 8 ? fmtSecs(sec.start) : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {showAnalysisJson && <JsonPanel data={audioAnalysis} label="Spotify /audio-analysis response" />}
          </>
        )}

        <Divider />

        {/* ── Action row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {track.externalUrl && (
            <button
              onClick={() => { void open(track.externalUrl); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                backgroundColor: '#1DB954', color: '#000',
                border: 'none', borderRadius: 500, padding: '10px 22px',
                fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.05em',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1ed760')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1DB954')}
            >
              Open in Spotify ↗
            </button>
          )}
          <button
            onClick={() => { void toggleJson(); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 500, padding: '9px 16px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.13)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          >
            {showJson ? '▲ Hide JSON' : '{ } Raw JSON'}
          </button>
        </div>

        {/* ── Raw JSON panel ── */}
        {showJson && (
          <div style={{ marginTop: 22 }}>
            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 16 }} />
            <div style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>
              Full Spotify Payload
            </div>
            <pre
              dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(meta, null, 2)) }}
              style={{
                margin: 0, padding: '14px 16px',
                backgroundColor: '#1a1a1a', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
                fontSize: '0.72rem', lineHeight: 1.6,
                overflowX: 'auto', color: '#d4d4d4', whiteSpace: 'pre',
              }}
            />
          </div>
        )}

        {/* ── API Call Log ── */}
        <Divider />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showApiLog ? 14 : 0 }}>
          <button
            onClick={async () => {
              const next = !showApiLog;
              setShowApiLog(next);
              if (next) {
                setLogLoading(true);
                try {
                  const log = await getApiLog();
                  setApiLog(log);
                } catch {
                  setApiLog([]);
                } finally {
                  setLogLoading(false);
                }
              }
              try {
                const win = getCurrentWebviewWindow();
                const perSection = [showTrackJson, showFeaturesJson, showAnalysisJson].filter(Boolean).length;
                const extraHeight = (showJson ? JSON_EXTRA : 0) + (next ? 400 : 0);
                await win.setSize(new LogicalSize(540, BASE_HEIGHT + perSection * JSON_PER_PANEL + extraHeight));
              } catch { /* scrollable fallback */ }
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: showApiLog ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 500, padding: '9px 16px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.13)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = showApiLog ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.07)')}
          >
            {showApiLog ? '▲ Hide API Log' : '⚡ API Call Log'}
          </button>

          {showApiLog && (
            <button
              onClick={async () => {
                setLogLoading(true);
                try {
                  const log = await getApiLog();
                  setApiLog(log);
                } catch {
                  setApiLog([]);
                } finally {
                  setLogLoading(false);
                }
              }}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 6, padding: '4px 10px',
                color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
            >
              ↻ Refresh
            </button>
          )}
        </div>

        {showApiLog && (
          <div style={{ marginTop: 4 }}>
            {logLoading && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', textAlign: 'center', padding: '20px 0' }}>
                Loading…
              </div>
            )}
            {!logLoading && apiLog.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', textAlign: 'center', padding: '20px 0' }}>
                No API calls logged yet. Change tracks and reopen this panel.
              </div>
            )}
            {!logLoading && apiLog.map((entry) => (
              <ApiCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
