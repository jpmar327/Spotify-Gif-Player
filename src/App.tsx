import { useState, useEffect, useCallback } from 'react';
import { LoginView } from './views/LoginView';
import { PlayerView } from './views/PlayerView';
import {
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
  setPkceVerifier,
  getPkceVerifier,
  clearPkceVerifier,
} from './lib/store';
import {
  generateVerifier,
  generateChallenge,
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
} from './lib/auth';
import { open } from '@tauri-apps/plugin-shell';
import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link';

type AuthState = 'loading' | 'login' | 'player';

// Shared handler: read verifier from store, exchange code, return tokens.
// Works whether called from the running instance or a freshly-launched one.
async function redeemCallback(
  urlStr: string
): Promise<{ access_token: string; refresh_token: string }> {
  const code = new URL(urlStr).searchParams.get('code');
  if (!code) throw new Error('No code in callback URL');

  const verifier = await getPkceVerifier();
  if (!verifier) throw new Error('PKCE verifier not found — did login flow start correctly?');

  await clearPkceVerifier();
  return exchangeCode(code, verifier);
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [accessToken, setAccessToken] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const completeAuth = useCallback(async (urlStr: string) => {
    try {
      const { access_token, refresh_token } = await redeemCallback(urlStr);
      await setRefreshToken(refresh_token);
      setAccessToken(access_token);
      setAuthError(null);
      setAuthState('player');
    } catch (err) {
      console.error('[Auth] Callback failed:', err);
      setAuthError(String(err));
      setAuthState('login');
    }
  }, []);

  // On mount: silently restore session from stored refresh token
  useEffect(() => {
    void (async () => {
      try {
        const stored = await getRefreshToken();
        if (stored) {
          const { access_token, refresh_token: newRefresh } = await refreshAccessToken(stored);
          if (newRefresh) await setRefreshToken(newRefresh);
          setAccessToken(access_token);
          setAuthState('player');
        } else {
          setAuthState('login');
        }
      } catch {
        setAuthState('login');
      }
    })();
  }, []);

  // Handle the case where THIS process was launched directly by the deep link
  // (single-instance plugin wasn't fast enough, or OS launched fresh)
  useEffect(() => {
    void (async () => {
      try {
        const urls = await getCurrent();
        if (urls && urls.length > 0) {
          await completeAuth(urls[0]);
        }
      } catch {
        // getCurrent() throws when there's no startup URL — that's normal
      }
    })();
  }, [completeAuth]);

  // Handle the case where the EXISTING process receives the deep link URL
  // (forwarded from the second process by tauri-plugin-single-instance)
  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let cancelled = false;

    void onOpenUrl(async (urls) => {
      if (urls.length > 0) await completeAuth(urls[0]);
    }).then((fn) => {
      if (cancelled) fn();
      else unlistenFn = fn;
    });

    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, [completeAuth]);

  const handleLogin = useCallback(async () => {
    setAuthError(null);
    try {
      const verifier = generateVerifier();
      await setPkceVerifier(verifier); // persist so it survives a process restart
      const challenge = await generateChallenge(verifier);
      await open(buildAuthUrl(challenge));
    } catch (err) {
      console.error('[Auth] Login failed:', err);
      setAuthError(`Could not open browser: ${String(err)}`);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await clearRefreshToken();
    await clearPkceVerifier();
    setAccessToken('');
    setAuthError(null);
    setAuthState('login');
  }, []);

  const handleTokenRefreshed = useCallback((token: string) => {
    setAccessToken(token);
  }, []);

  if (authState === 'loading') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'system-ui', fontSize: '0.85rem' }}>
          Loading…
        </span>
      </div>
    );
  }

  if (authState === 'login') {
    return (
      <>
        <LoginView onLogin={handleLogin} />
        {authError && (
          <div
            style={{
              position: 'fixed',
              bottom: 20,
              left: 20,
              right: 20,
              backgroundColor: 'rgba(180, 40, 40, 0.92)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              wordBreak: 'break-all',
              lineHeight: 1.5,
            }}
          >
            {authError}
          </div>
        )}
      </>
    );
  }

  return (
    <PlayerView
      accessToken={accessToken}
      onLogout={handleLogout}
      onTokenRefreshed={handleTokenRefreshed}
    />
  );
}
