import { loggedFetch } from './apiLogger';
import { getSearchTerm } from './genreSearchTerms';

const API_KEY = import.meta.env.VITE_GIPHY_API_KEY as string;
const GIPHY_SEARCH = 'https://api.giphy.com/v1/gifs/search';

export interface GiphyResult {
  url: string;
  id: string;
  resultCount: number;
}

export async function fetchGif(query: string): Promise<GiphyResult | null> {
  if (!API_KEY || API_KEY === 'your_giphy_api_key_here') {
    console.warn('[Giphy] No API key set — returning placeholder. Add VITE_GIPHY_API_KEY to .env');
    return { url: '/idle.gif', id: 'placeholder', resultCount: 1 };
  }

  const params = new URLSearchParams({
    q: getSearchTerm(query),
    api_key: API_KEY,
    limit: '20',
    rating: 'g',
  });

  let res: Response;
  try {
    res = await loggedFetch('Giphy GET /gifs/search', `${GIPHY_SEARCH}?${params}`);
  } catch {
    return null;
  }

  if (!res.ok) {
    console.error('[Giphy] API error:', res.status);
    return null;
  }

  const data = (await res.json()) as {
    data: Array<{ id: string; images: { original: { url: string } } }>;
  };

  if (!data.data || data.data.length === 0) return null;

  const pick = data.data[Math.floor(Math.random() * data.data.length)];
  return { url: pick.images.original.url, id: pick.id, resultCount: data.data.length };
}

export function preloadGif(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => resolve(url), 800);
    img.onload = () => { clearTimeout(timeout); resolve(url); };
    img.onerror = () => { clearTimeout(timeout); resolve(url); };
    img.src = url;
  });
}
