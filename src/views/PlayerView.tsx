import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { open } from '@tauri-apps/plugin-shell';
import { useSpotify } from '../hooks/useSpotify';
import { useGiphy } from '../hooks/useGiphy';
import { getAudioFeatures, getAudioAnalysis } from '../lib/spotify';

interface Props {
  accessToken: string;
  onLogout: () => void;
  onTokenRefreshed: (token: string) => void;
}

export function PlayerView({ accessToken, onLogout, onTokenRefreshed }: Props) {
  const [isRunning, setIsRunning] = useState(true);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { gifUrl, visible, changeGif, showIdle } = useGiphy('/idle.gif');
  const { currentTrack, currentGenre, pause, resume, next, previous } = useSpotify({
    accessToken,
    onTrackChange: changeGif,
    onIdle: showIdle,
    onTokenRefreshed,
    isRunning,
  });

  const showOverlay = useCallback(() => {
    setOverlayVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setOverlayVisible(false), 3000);
  }, []);

  useEffect(() => {
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, []);

  const handleOpenInfo = useCallback(async () => {
    if (!currentTrack) return;

    const [audioFeatures, audioAnalysis] = await Promise.all([
      getAudioFeatures(currentTrack.trackId, accessToken).catch(() => null),
      getAudioAnalysis(currentTrack.trackId, accessToken).catch(() => null),
    ]);

    localStorage.setItem(
      'gif-player-meta',
      JSON.stringify({ track: currentTrack, genre: currentGenre, audioFeatures, audioAnalysis })
    );

    const win = new WebviewWindow('track-metadata', {
      url: '/?view=metadata',
      title: 'Track Info',
      width: 540,
      height: 820,
      resizable: false,
      decorations: true,
      alwaysOnTop: true,
    });
    win.once('tauri://error', (e) => console.error('[meta-window]', e));
  }, [currentTrack, currentGenre, accessToken]);

  const isSpotifyPlaying = currentTrack?.isPlaying ?? false;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#000',
        cursor: overlayVisible ? 'default' : 'none',
      }}
      onMouseMove={showOverlay}
    >
      {/* Fullscreen GIF */}
      <img
        src={gifUrl}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          opacity: visible ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
      />

      {/* Hover overlay — bottom of screen */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          right: 24,
          opacity: overlayVisible ? 1 : 0,
          transition: overlayVisible ? 'opacity 200ms ease' : 'opacity 500ms ease',
          pointerEvents: overlayVisible ? 'auto' : 'none',
        }}
        onMouseEnter={() => {
          // Cancel the auto-hide timer while the cursor is over the panel
          if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
        }}
        onMouseLeave={() => {
          // Restart the hide timer once the cursor leaves the panel
          hideTimerRef.current = setTimeout(() => setOverlayVisible(false), 1500);
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.78)',
            backdropFilter: 'blur(14px)',
            borderRadius: 16,
            padding: '14px 16px 10px',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* ── Track info row ── */}
          {currentTrack ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {currentTrack.albumArt && (
                <img
                  src={currentTrack.albumArt}
                  alt="Album art"
                  style={{ width: 54, height: 54, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentTrack.explicit && (
                    <span
                      style={{
                        fontSize: '0.58rem',
                        backgroundColor: 'rgba(255,255,255,0.28)',
                        borderRadius: 2,
                        padding: '1px 4px',
                        marginRight: 6,
                        verticalAlign: 'middle',
                        letterSpacing: '0.04em',
                      }}
                    >
                      E
                    </span>
                  )}
                  {currentTrack.trackName}
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'rgba(255,255,255,0.65)',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentTrack.artistName}
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'rgba(255,255,255,0.42)',
                    marginTop: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentTrack.albumName}
                  {currentGenre ? ` · ${currentGenre}` : ''}
                </div>
              </div>

              {/* Info button */}
              <button
                onClick={() => { void handleOpenInfo(); }}
                title="View track details"
                style={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              >
                ℹ
              </button>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.35)',
                fontSize: '0.8rem',
                padding: '6px 0',
              }}
            >
              Nothing playing
            </div>
          )}

          {/* ── Playback controls ── */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            <IconButton onClick={previous} title="Previous">⏮</IconButton>
            <IconButton onClick={isSpotifyPlaying ? pause : resume} title={isSpotifyPlaying ? 'Pause' : 'Play'} primary>
              {isSpotifyPlaying ? '⏸' : '▶'}
            </IconButton>
            <IconButton onClick={next} title="Next">⏭</IconButton>
          </div>

          {/* ── Divider ── */}
          <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 -4px' }} />

          {/* ── App controls ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <TextButton
              label="GIF ↗"
              disabled={!gifUrl || gifUrl === '/idle.gif'}
              onClick={() => { if (gifUrl && gifUrl !== '/idle.gif') void open(gifUrl); }}
              title="Open current GIF in browser"
            />
            <Sep />
            <TextButton label="Start" disabled={isRunning} onClick={() => setIsRunning(true)} />
            <Sep />
            <TextButton
              label="Stop"
              disabled={!isRunning}
              onClick={() => { setIsRunning(false); showIdle(); }}
            />
            <Sep />
            <TextButton label="Logout" onClick={onLogout} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────

function IconButton({
  children,
  onClick,
  title,
  primary,
}: {
  children: ReactNode;
  onClick: () => void;
  title?: string;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: primary ? 40 : 32,
        height: primary ? 40 : 32,
        borderRadius: '50%',
        border: 'none',
        background: primary ? 'rgba(29,185,84,0.85)' : 'rgba(255,255,255,0.1)',
        color: '#fff',
        cursor: 'pointer',
        fontSize: primary ? '1rem' : '0.9rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = primary
          ? 'rgba(29,185,84,1)'
          : 'rgba(255,255,255,0.2)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = primary
          ? 'rgba(29,185,84,0.85)'
          : 'rgba(255,255,255,0.1)')
      }
    >
      {children}
    </button>
  );
}

function TextButton({
  label,
  onClick,
  disabled,
  title,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        color: disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.65)',
        fontSize: '0.7rem',
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        padding: '2px 10px',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 11, backgroundColor: 'rgba(255,255,255,0.18)' }} />;
}
