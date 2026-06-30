import { loggedFetch } from './apiLogger';

const API_KEY = import.meta.env.VITE_KLIPY_API_KEY as string;
// Klipy's GIF search endpoint — confirm against current docs at
// https://klipy.com/developers if this returns a 404, the path may have changed.
const KLIPY_SEARCH = 'https://api.klipy.co/api/v1/gifs/search';

export interface KlipyResult {
  url: string;
  id: string;
}

export async function fetchKlipyGif(query: string): Promise<KlipyResult | null> {
  if (!API_KEY || API_KEY === 'your_klipy_api_key_here') {
    console.warn('[Klipy] No API key set — skipping fallback. Add VITE_KLIPY_API_KEY to .env');
    return null;
  }

  const params = new URLSearchParams({
    q: query,
    api_key: API_KEY,
    per_page: '20',
  });

  let res: Response;
  try {
    res = await loggedFetch('Klipy GET /gifs/search', `${KLIPY_SEARCH}?${params}`);
  } catch {
    return null;
  }

  if (!res.ok) {
    console.error('[Klipy] API error:', res.status);
    return null;
  }

  // Klipy's response shape per their docs:
  // { result: true, data: { data: [ { id, files: { ... } } ], current_page, per_page, has_next } }
  // The exact field used for the playable GIF URL inside `files` should be verified
  // against the live API response — check the API Call Log in MetadataView after
  // the first successful call to confirm the correct nested field name.
  const json = (await res.json()) as {
    result?: boolean;
    data?: { data?: Array<{ id: string; files?: Record<string, { url?: string }> }> };
  };

  const items = json.data?.data;
  if (!items || items.length === 0) return null;

  const pick = items[Math.floor(Math.random() * items.length)];

  // Try common Klipy file format keys in order of preference
  const fileUrl =
    pick.files?.original?.url ??
    pick.files?.gif?.url ??
    pick.files?.['400w']?.url ??
    Object.values(pick.files ?? {})[0]?.url;

  if (!fileUrl) return null;

  return { url: fileUrl, id: pick.id };
}
