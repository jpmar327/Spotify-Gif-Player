import { setApiLog, getApiLog, redactUrl, type ApiLogEntry } from './store';

export async function loggedFetch(
  label: string,
  url: string,
  options?: RequestInit
): Promise<Response> {
  const start = Date.now();
  const method = (options?.method as 'GET' | 'POST') ?? 'GET';

  let response: Response;
  let status: number | null = null;
  let responseData: unknown = null;

  try {
    response = await fetch(url, options);
    status = response.status;

    // Clone so the caller can still read the body
    const clone = response.clone();
    try {
      responseData = await clone.json();
    } catch {
      responseData = await clone.text().catch(() => '[unreadable body]');
    }
  } catch (err) {
    const durationMs = Date.now() - start;
    const entry: ApiLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label,
      url: redactUrl(url),
      method,
      status: null,
      durationMs,
      requestedAt: new Date().toISOString(),
      response: String(err),
    };
    try {
      const existing = await getApiLog();
      await setApiLog([...existing, entry]);
    } catch { /* log write must not prevent the caller from seeing the network error */ }
    throw err;
  }

  const durationMs = Date.now() - start;
  const entry: ApiLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label,
    url: redactUrl(url),
    method,
    status,
    durationMs,
    requestedAt: new Date().toISOString(),
    response: responseData,
  };

  try {
    const existing = await getApiLog();
    await setApiLog([...existing, entry]);
  } catch { /* log write must not affect the returned response */ }

  return response;
}
