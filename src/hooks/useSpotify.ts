import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getCurrentlyPlaying,
  getArtistGenres,
  genreFinder,
  pausePlayback,
  resumePlayback,
  skipToNext,
  skipToPrevious,
  type NowPlaying,
} from '../lib/spotify';
import { refreshAccessToken } from '../lib/auth';
import { getRefreshToken, setRefreshToken, clearApiLog } from '../lib/store';
import { getTrackTags } from '../lib/lastfm';

interface UseSpotifyOptions {
  accessToken: string;
  onTrackChange: (genre: string) => void;
  onIdle: () => void;
  onTokenRefreshed: (newToken: string) => void;
  isRunning: boolean;
  autoRotate: boolean;
}

export interface UseSpotifyResult {
  currentTrack: NowPlaying | null;
  currentGenre: string | null;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
}

export function useSpotify({
  accessToken,
  onTrackChange,
  onIdle,
  onTokenRefreshed,
  isRunning,
  autoRotate,
}: UseSpotifyOptions): UseSpotifyResult {
  const [currentTrack, setCurrentTrack] = useState<NowPlaying | null>(null);
  const [currentGenre, setCurrentGenre] = useState<string | null>(null);

  const previousTrackIdRef = useRef<string | null>(null);
  const tokenRef = useRef(accessToken);
  const onTrackChangeRef = useRef(onTrackChange);
  const onIdleRef = useRef(onIdle);
  const onTokenRefreshedRef = useRef(onTokenRefreshed);
  const wasIdleRef = useRef(false);
  const lastGenreRef = useRef<string | null>(null);
  const lastGifChangeRef = useRef<number>(0);
  const autoRotateRef = useRef(autoRotate);

  tokenRef.current = accessToken;
  onTrackChangeRef.current = onTrackChange;
  onIdleRef.current = onIdle;
  onTokenRefreshedRef.current = onTokenRefreshed;
  autoRotateRef.current = autoRotate;

  useEffect(() => {
    if (!isRunning || !accessToken) return;

    wasIdleRef.current = false;
    previousTrackIdRef.current = null;

    const doRefresh = async (): Promise<string> => {
      const stored = await getRefreshToken();
      if (!stored) throw new Error('No refresh token');
      const result = await refreshAccessToken(stored);
      const token = result.access_token;
      tokenRef.current = token;
      onTokenRefreshedRef.current(token);
      if (result.refresh_token) await setRefreshToken(result.refresh_token);
      return token;
    };

    const tick = async () => {
      let token = tokenRef.current;
      if (!token) return;

      let playback: NowPlaying | null;
      try {
        playback = await getCurrentlyPlaying(token);
      } catch (err: unknown) {
        if ((err as { status?: number }).status === 401) {
          try {
            token = await doRefresh();
            playback = await getCurrentlyPlaying(token);
          } catch {
            if (!wasIdleRef.current) { wasIdleRef.current = true; setCurrentTrack(null); setCurrentGenre(null); onIdleRef.current(); }
            return;
          }
        } else {
          if (!wasIdleRef.current) { wasIdleRef.current = true; setCurrentTrack(null); setCurrentGenre(null); onIdleRef.current(); }
          return;
        }
      }

      // Spotify closed — clear track info and show idle
      if (!playback) {
        if (!wasIdleRef.current) {
          wasIdleRef.current = true;
          setCurrentTrack(null);
          setCurrentGenre(null);
          onIdleRef.current();
        }
        return;
      }

      // Spotify paused — keep track info visible, but show idle GIF
      if (!playback.isPlaying) {
        setCurrentTrack(playback);
        if (!wasIdleRef.current) {
          wasIdleRef.current = true;
          onIdleRef.current();
        }
        return;
      }

      // Actively playing
      const wasIdle = wasIdleRef.current;
      wasIdleRef.current = false;
      setCurrentTrack(playback);

      if (playback.trackId === previousTrackIdRef.current) {
        if (wasIdle && lastGenreRef.current) {
          // Resumed from pause/idle — restore the GIF and reset the rotation timer
          lastGifChangeRef.current = Date.now();
          onTrackChangeRef.current(lastGenreRef.current);
        } else if (autoRotateRef.current && lastGenreRef.current && Date.now() - lastGifChangeRef.current >= 90_000) {
          // 1.5 minutes elapsed while the same track plays — rotate to a new GIF
          lastGifChangeRef.current = Date.now();
          onTrackChangeRef.current(lastGenreRef.current);
        }
        return;
      }

      // Track changed — fetch genres and trigger new GIF
      previousTrackIdRef.current = playback.trackId;
      await clearApiLog();

      let genres: string[] = [];

      // 1st: Last.fm — track-level tags, most accurate and best coverage
      try {
        genres = await getTrackTags(playback.artistName, playback.trackName);
      } catch {
        // Last.fm failed — will try Spotify below
      }

      // 2nd: Spotify — artist-level genres, broader but always available since
      // artistId is already in the playback payload (no extra round trip cost)
      if (genres.length === 0) {
        try {
          genres = await getArtistGenres(playback.artistId, tokenRef.current);
        } catch {
          // Spotify also failed — genre will fall back via genreFinder below
        }
      }

      // 3rd: 'music visualizer' is a better Giphy/Klipy search term than plain
      // 'music' when neither source returns a usable genre
      const genre = genreFinder(genres) ?? 'music visualizer';
      lastGenreRef.current = genre;
      lastGifChangeRef.current = Date.now();
      setCurrentGenre(genre);
      onTrackChangeRef.current(genre);
    };

    const id = setInterval(() => { void tick(); }, 750);
    return () => clearInterval(id);
  }, [isRunning, accessToken]);

  const makeControl = useCallback(
    (fn: (token: string) => Promise<void>) => async () => {
      try { await fn(tokenRef.current); } catch (err) { console.error('[Spotify control]', err); }
    },
    []
  );

  return {
    currentTrack,
    currentGenre,
    pause: makeControl(pausePlayback),
    resume: makeControl(resumePlayback),
    next: makeControl(skipToNext),
    previous: makeControl(skipToPrevious),
  };
}
