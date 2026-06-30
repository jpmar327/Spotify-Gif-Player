import { useState, useRef, useCallback } from 'react';
import { fetchGif, preloadGif } from '../lib/giphy';
import { fetchKlipyGif } from '../lib/klipy';

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
      let resultUrl: string | null = null;
      let resultId: string | null = null;

      const giphyResult = await fetchGif(genre);

      // Use Giphy if it returned a healthy result set (5+ candidates).
      // A thin result set (1-4) often means weak genre coverage on Giphy's side.
      if (giphyResult && giphyResult.resultCount >= 5) {
        resultUrl = giphyResult.url;
        resultId = giphyResult.id;

        // Avoid repeating the same GIF back-to-back
        if (resultId === lastIdRef.current) {
          const retry = await fetchGif(genre);
          if (retry && retry.id !== lastIdRef.current) {
            resultUrl = retry.url;
            resultId = retry.id;
          }
        }
      } else {
        // Giphy result was empty or thin — try Klipy
        const klipyResult = await fetchKlipyGif(genre);
        if (klipyResult) {
          resultUrl = klipyResult.url;
          resultId = klipyResult.id;
        } else if (giphyResult) {
          // Klipy also failed but Giphy had at least something — use it anyway
          resultUrl = giphyResult.url;
          resultId = giphyResult.id;
        }
      }

      // Last resort: generic Giphy search if everything above failed
      if (!resultUrl) {
        const fallback = await fetchGif('music visualizer');
        if (fallback) {
          resultUrl = fallback.url;
          resultId = fallback.id;
        }
      }

      if (!resultUrl || !resultId) return;

      lastIdRef.current = resultId;
      const url = await preloadGif(resultUrl);
      crossfadeTo(url);
    },
    [crossfadeTo]
  );

  const showIdle = useCallback(() => {
    crossfadeTo(idleUrl);
  }, [crossfadeTo, idleUrl]);

  return { gifUrl, visible, changeGif, showIdle };
}
