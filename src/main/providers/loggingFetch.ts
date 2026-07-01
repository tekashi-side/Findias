import type { FetchLike } from './githubReleases';

// Future-proofing: there is no auth header today, but never print one if it is
// ever added (e.g. an authenticated GitHub request for a higher rate limit).
const SENSITIVE = /^(authorization|cookie|set-cookie|.*(token|secret|key).*)$/i;

/** Normalize any headers init (object | array | Headers) to a readable, redacted block. */
const dumpHeaders = (headers: RequestInit['headers']): string => {
  const lines = [...new Headers(headers)].map(
    ([key, value]) => `${key}: ${SENSITIVE.test(key) ? '<redacted>' : value}`,
  );
  return lines.length ? `\n    ${lines.join('\n    ')}` : ' (none)';
};

export interface LoggingFetchOptions {
  /** Also log the (redacted) request and response headers. */
  verbose?: boolean;
  /** The underlying fetch to delegate to (defaults to the global `fetch`). */
  inner?: FetchLike;
}

/**
 * Wrap a `FetchLike` so each request logs its method, URL, status, `ETag`, and
 * remaining rate-limit quota to the main-process stdout (the `npm run dev`
 * terminal) — the only place main-process network activity is visible, since it
 * never reaches the renderer DevTools Network tab.
 *
 * It reads headers only and returns the `Response` untouched — it never consumes
 * the body (`.json()`/`.text()`/`.body`), so streamed `.it` downloads are safe.
 * Note the logged duration is time-to-Response (headers), not full transfer time,
 * because bodies are streamed later by the downloader.
 */
export const createLoggingFetch = (options: LoggingFetchOptions = {}): FetchLike => {
  const inner = options.inner ?? fetch;
  return async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString();
    const started = Date.now();
    const res = await inner(input, init);
    const ms = Date.now() - started;
    console.log(
      `[net] ${init?.method ?? 'GET'} ${url} -> ${res.status} ${res.statusText} (${ms}ms)` +
        ` etag=${res.headers.get('etag') ?? '-'}` +
        ` ratelimit=${res.headers.get('x-ratelimit-remaining') ?? '-'}/${res.headers.get('x-ratelimit-limit') ?? '-'}`,
    );
    if (options.verbose) {
      console.log(`[net]   request headers:${dumpHeaders(init?.headers)}`);
      console.log(`[net]   response headers:${dumpHeaders(res.headers)}`);
    }
    return res;
  };
};
