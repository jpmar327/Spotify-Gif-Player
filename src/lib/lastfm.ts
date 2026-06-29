import { loggedFetch } from './apiLogger';

const API_KEY = import.meta.env.VITE_LASTFM_API_KEY as string;
const BASE = 'https://ws.audioscrobbler.com/2.0/';

export interface LastFmTag {
  name: string;
  count: number;
}

// Common Last.fm crowd-sourced tags that carry no genre information.
// These are filtered out before passing tags to genreFinder.
const NOISE_TAGS = new Set([
  'music', 'seen live', 'favourite', 'favorites', 'favourite songs',
  'love', 'awesome', 'cool', 'great', 'best', 'good', 'beautiful',
  'amazing', 'classic', 'all', 'check out', 'albums i own',
  'under 2000 listeners', 'spotify', 'youtube', 'bandcamp',
  'female vocalists', 'male vocalists', 'singer-songwriter',
]);

export async function getTrackTags(
  artist: string,
  track: string
): Promise<string[]> {
  if (!API_KEY || API_KEY === 'your_lastfm_api_key_here') {
    console.warn('[Last.fm] No API key set — skipping genre fallback. Add VITE_LASTFM_API_KEY to .env');
    return [];
  }

  const params = new URLSearchParams({
    method: 'track.getTopTags',
    artist,
    track,
    api_key: API_KEY,
    format: 'json',
    autocorrect: '1',
  });

  try {
    const res = await loggedFetch('Last.fm track.getTopTags', `${BASE}?${params}`);
    if (!res.ok) return [];

    const data = (await res.json()) as {
      toptags?: { tag?: Array<{ name: string; count: number }> };
      error?: number;
    };

    if (data.error || !data.toptags?.tag) return [];

    return data.toptags.tag
      .filter((t) => t.count > 0 && !NOISE_TAGS.has(t.name.toLowerCase()))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((t) => t.name.toLowerCase());
  } catch {
    return [];
  }
}
