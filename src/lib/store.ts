import { Store } from '@tauri-apps/plugin-store';
import { emit } from '@tauri-apps/api/event';

const STORE_PATH = 'tokens.bin';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const PKCE_VERIFIER_KEY = 'pkce_verifier_temp';

let store: Store | null = null;

async function getStore(): Promise<Store> {
  if (!store) {
    store = await Store.load(STORE_PATH);
  }
  return store;
}

export async function getRefreshToken(): Promise<string | null> {
  const s = await getStore();
  return (await s.get<string>(REFRESH_TOKEN_KEY)) ?? null;
}

export async function setRefreshToken(token: string): Promise<void> {
  const s = await getStore();
  await s.set(REFRESH_TOKEN_KEY, token);
  await s.save();
}

export async function clearRefreshToken(): Promise<void> {
  const s = await getStore();
  await s.delete(REFRESH_TOKEN_KEY);
  await s.save();
}

export async function setPkceVerifier(verifier: string): Promise<void> {
  const s = await getStore();
  await s.set(PKCE_VERIFIER_KEY, verifier);
  await s.save();
}

export async function getPkceVerifier(): Promise<string | null> {
  const s = await getStore();
  return (await s.get<string>(PKCE_VERIFIER_KEY)) ?? null;
}

export async function clearPkceVerifier(): Promise<void> {
  const s = await getStore();
  await s.delete(PKCE_VERIFIER_KEY);
  await s.save();
}

const META_KEY = 'track_metadata';

export async function setTrackMeta(data: unknown): Promise<void> {
  const s = await getStore();
  await s.set(META_KEY, JSON.stringify(data));
  await s.save();
}

export async function getTrackMeta(): Promise<unknown | null> {
  const s = await getStore();
  const raw = await s.get<string>(META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── API call log ─────────────────────────────────────────────────

export interface ApiLogEntry {
  id: string;
  label: string;
  url: string;
  method: 'GET' | 'POST';
  status: number | null;
  durationMs: number;
  requestedAt: string;
  response: unknown;
}

export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const key of ['api_key', 'key', 'client_id', 'access_token']) {
      if (u.searchParams.has(key)) u.searchParams.set(key, '[redacted]');
    }
    return u.toString();
  } catch {
    return url;
  }
}

const API_LOG_KEY = 'api_call_log';

export async function setApiLog(entries: ApiLogEntry[]): Promise<void> {
  const s = await getStore();
  await s.set(API_LOG_KEY, JSON.stringify(entries));
  await s.save();
  emit('api-log-updated', entries).catch(() => {});
}

export async function getApiLog(): Promise<ApiLogEntry[]> {
  const s = await getStore();
  const raw = await s.get<string>(API_LOG_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ApiLogEntry[];
  } catch {
    return [];
  }
}

export async function clearApiLog(): Promise<void> {
  const s = await getStore();
  await s.delete(API_LOG_KEY);
  await s.save();
  emit('api-log-updated', [] as ApiLogEntry[]).catch(() => {});
}
