import { Store } from '@tauri-apps/plugin-store';

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
