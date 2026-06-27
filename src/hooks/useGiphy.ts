import { useState, useRef, useCallback } from 'react';
import { fetchGif, preloadGif } from '../lib/giphy';

export function useGiphy(idleUrl: string) {
  const [gifUrl, setGifUrl] = useState<string>(idleUrl);
  const [visible, setVisible] = useState(true);
  const lastIdRef = useRef<string | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const crossfadeTo = useCallback((url: string) => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setVisible(false);
    fadeTimerRef.current = setTimeout(() => {
      setGifUrl(url);
      setVisible(true);
      fadeTimerRef.current = null;
    }, 300);
  }, []);

  const changeGif = useCallback(
    async (genre: string) => {
      let result = await fetchGif(genre);

      // Avoid repeating the same GIF back-to-back
      if (result && result.id === lastIdRef.current) {
        const retry = await fetchGif(genre);
        if (retry && retry.id !== lastIdRef.current) result = retry;
      }

      // Fallback to generic "music" search if genre yielded nothing
      if (!result) result = await fetchGif('music');
      if (!result) return;

      lastIdRef.current = result.id;
      const url = await preloadGif(result.url);
      crossfadeTo(url);
    },
    [crossfadeTo]
  );

  const showIdle = useCallback(() => {
    crossfadeTo(idleUrl);
  }, [crossfadeTo, idleUrl]);

  return { gifUrl, visible, changeGif, showIdle };
}
