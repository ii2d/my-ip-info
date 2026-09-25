export const DEFAULT_INDEXNOW_KEY = 'e860aba3b4ba1700c1f44fa0abd9376f';
export const DEFAULT_INDEXNOW_HOST = 'ip.ii2d.com';
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
export const BING_INDEXNOW_ENDPOINT = 'https://www.bing.com/indexnow';

export const INDEXNOW_KEY_REGEX = /^[a-zA-Z0-9-]{8,128}$/;

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation?: string;
  urlList: string[];
}

export interface IndexNowSubmitOptions {
  host?: string;
  key?: string;
  keyLocation?: string;
  urls: string[];
  endpoint?: string;
}

export interface IndexNowSubmitResult {
  ok: boolean;
  status: number;
  message: string;
  endpoint: string;
  urlCount: number;
}

export function isValidIndexNowKey(key: string): boolean {
  return typeof key === 'string' && INDEXNOW_KEY_REGEX.test(key.trim());
}

export function parseSitemapUrls(sitemapXml: string): string[] {
  const matches = sitemapXml.matchAll(/<loc>\s*(https?:\/\/[^\s<]+)\s*<\/loc>/gi);
  const urls: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      urls.push(match[1].trim());
    }
  }
  return urls;
}

export function buildIndexNowPayload(options: IndexNowSubmitOptions): IndexNowPayload {
  const host = (options.host || DEFAULT_INDEXNOW_HOST).trim().toLowerCase();
  const key = (options.key || DEFAULT_INDEXNOW_KEY).trim();

  if (!host) {
    throw new Error('IndexNow submission requires a valid host domain');
  }

  if (!isValidIndexNowKey(key)) {
    throw new Error(
      `Invalid IndexNow key "${key}". Key must be between 8 and 128 alphanumeric/hex characters.`
    );
  }

  const rawUrls = options.urls || [];
  const validUrls = rawUrls
    .map((u) => u.trim())
    .filter((u) => {
      try {
        const parsed = new URL(u);
        return parsed.hostname.toLowerCase() === host;
      } catch {
        return false;
      }
    });

  if (validUrls.length === 0) {
    throw new Error(`No valid URLs found matching host "${host}"`);
  }

  if (validUrls.length > 10000) {
    throw new Error('IndexNow allows a maximum of 10,000 URLs per submission batch');
  }

  const payload: IndexNowPayload = {
    host,
    key,
    urlList: validUrls,
  };

  const keyLocation = options.keyLocation?.trim();
  if (keyLocation) {
    payload.keyLocation = keyLocation;
  } else {
    payload.keyLocation = `https://${host}/${key}.txt`;
  }

  return payload;
}

export async function submitIndexNow(
  options: IndexNowSubmitOptions,
  fetchFn: typeof fetch = fetch
): Promise<IndexNowSubmitResult> {
  const endpoint = options.endpoint || INDEXNOW_ENDPOINT;
  const payload = buildIndexNowPayload(options);

  try {
    const res = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'MyIPInfo-IndexNow/1.0',
      },
      body: JSON.stringify(payload),
    });

    const status = res.status;
    let message = `HTTP ${status}`;

    switch (status) {
      case 200:
        message = 'IndexNow submission succeeded: search engines notified.';
        break;
      case 202:
        message = 'IndexNow submission accepted: key validation pending.';
        break;
      case 400:
        message =
          'IndexNow 400 Bad Request: invalid format or missing required payload parameters.';
        break;
      case 403:
        message =
          'IndexNow 403 Forbidden: inauthentic key or key not hosted at expected keyLocation.';
        break;
      case 422:
        message =
          'IndexNow 422 Unprocessable Entity: URLs do not belong to host or key does not match schema.';
        break;
      case 429:
        message = 'IndexNow 429 Too Many Requests: submission rate limit exceeded.';
        break;
      default:
        message = `IndexNow HTTP ${status}: unexpected response from ${endpoint}`;
    }

    return {
      ok: status === 200 || status === 202,
      status,
      message,
      endpoint,
      urlCount: payload.urlList.length,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 0,
      message: `IndexNow submission failed: ${errorMsg}`,
      endpoint,
      urlCount: payload.urlList.length,
    };
  }
}
