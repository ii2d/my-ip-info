import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import packageJson from '../../package.json';
import { getIpVersion, isBogonIp } from '../shared/ip';
import type { CloudflareCfData, IpInfoResponse } from '../shared/types';
import { extractClientIp, extractCloudflareGeo } from './extractors';
import { formatPlaintext, formatYaml, isCliRequest } from './formatters';

export interface CreateAppOptions {
  providerName?: string;
  defaultGeo?: (ip: string) => Promise<IpInfoResponse['geo'] | undefined>;
  ip2LocationApiKey?: string;
  fetchFn?: typeof fetch;
}

export function createIpApp(options: CreateAppOptions = {}) {
  const providerName = options.providerName || 'generic-serverless';
  const app = new Hono();

  // Enable CORS for all routes
  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'HEAD', 'OPTIONS'],
      allowHeaders: ['*'],
      exposeHeaders: ['Content-Length', 'X-Client-IP'],
      maxAge: 86400,
    })
  );

  // Enforce zero-caching and defensive security headers on all endpoints
  app.use('*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    c.header('Pragma', 'no-cache');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  });

  const buildIpResponse = (
    clientIp: string,
    reqHeaders: Headers,
    cfData?: CloudflareCfData | null,
    runtimeProtocol?: string
  ): IpInfoResponse => {
    const version = getIpVersion(clientIp);
    const isBogon = isBogonIp(clientIp);

    const geo = extractCloudflareGeo(cfData);

    const headersSummary = {
      userAgent: reqHeaders.get('user-agent') || undefined,
      acceptLanguage: reqHeaders.get('accept-language') || undefined,
      referer: reqHeaders.get('referer') || undefined,
      host: reqHeaders.get('host') || undefined,
      protocol: runtimeProtocol || reqHeaders.get('x-forwarded-proto') || 'https',
      tlsVersion: cfData?.tlsVersion,
      tlsCipher: cfData?.tlsCipher,
    };

    return {
      ip: clientIp,
      version,
      isBogon,
      provider: providerName,
      timestamp: new Date().toISOString(),
      geo,
      headers: headersSummary,
    };
  };

  const getCf = (c: Context): CloudflareCfData | undefined => {
    return (c.req.raw as unknown as { cf?: CloudflareCfData })?.cf;
  };

  const v1 = new Hono();

  // Health check
  v1.get('/health', (c: Context) => {
    return c.json({
      status: 'ok',
      version: packageJson.version,
      provider: providerName,
      timestamp: new Date().toISOString(),
    });
  });

  // Plain IP endpoint
  v1.get('/ip', (c: Context) => {
    const clientIp = extractClientIp(c.req.raw.headers);
    c.header('Content-Type', 'text/plain; charset=utf-8');
    c.header('X-Client-IP', clientIp);
    return c.text(`${clientIp}\n`);
  });

  // Dedicated Geo endpoint
  v1.get('/geo', async (c: Context) => {
    const cf = getCf(c);
    const clientIp = extractClientIp(c.req.raw.headers);
    const data = buildIpResponse(clientIp, c.req.raw.headers, cf);
    c.header('X-Client-IP', clientIp);
    return c.json(data.geo || { error: 'No geo data available for this provider' });
  });

  // Dedicated YAML endpoint
  v1.get('/yaml', async (c: Context) => {
    const cf = getCf(c);
    const clientIp = extractClientIp(c.req.raw.headers);
    const data = buildIpResponse(clientIp, c.req.raw.headers, cf);
    c.header('X-Client-IP', clientIp);
    return c.text(formatYaml(data), 200, {
      'Content-Type': 'text/yaml; charset=utf-8',
    });
  });

  // Comprehensive Info endpoint (smart format: CLI text vs JSON)
  v1.get('/info', async (c: Context) => {
    const rawHeaders = c.req.raw.headers;
    const cf = getCf(c);
    const clientIp = extractClientIp(rawHeaders);
    const data = buildIpResponse(clientIp, rawHeaders, cf);

    const ua = rawHeaders.get('user-agent') || '';
    const accept = rawHeaders.get('accept') || '';
    const formatQuery = c.req.query('format');

    c.header('X-Client-IP', clientIp);

    if (formatQuery === 'json' || accept.includes('application/json')) {
      return c.json(data);
    }
    if (formatQuery === 'yaml') {
      return c.text(formatYaml(data), 200, {
        'Content-Type': 'text/yaml; charset=utf-8',
      });
    }
    if (formatQuery === 'text' || formatQuery === 'ip' || isCliRequest(ua, accept)) {
      c.header('Content-Type', 'text/plain; charset=utf-8');
      return c.text(formatPlaintext(data));
    }

    // Default to JSON for browser and API requests
    return c.json(data);
  });

  const getIp2LocationApiKey = (c: Context): string | undefined => {
    if (options.ip2LocationApiKey) {
      return options.ip2LocationApiKey;
    }
    const env = c.env as Record<string, unknown> | undefined;
    if (typeof env?.IP2_LOCATION_API_KEY === 'string' && env.IP2_LOCATION_API_KEY.trim()) {
      return env.IP2_LOCATION_API_KEY.trim();
    }
    if (typeof process !== 'undefined' && process.env?.IP2_LOCATION_API_KEY?.trim()) {
      return process.env.IP2_LOCATION_API_KEY.trim();
    }
    return undefined;
  };

  // Dedicated IP2Location.io endpoint
  v1.get('/ip2location', async (c: Context) => {
    const apiKey = getIp2LocationApiKey(c);
    if (!apiKey) {
      return c.json(
        {
          error:
            'No IP2Location API key provided in environment. In production, set the secret via `pnpm secret:ip2location` or Cloudflare Dashboard.',
          configured: false,
        },
        200
      );
    }

    const queryIp = c.req.query('ip')?.trim();
    const clientIp = extractClientIp(c.req.raw.headers);
    const targetIp = queryIp || clientIp;

    c.header('X-Client-IP', targetIp);

    try {
      const url = new URL('https://api.ip2location.io/');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('format', 'json');

      if (queryIp) {
        url.searchParams.set('ip', queryIp);
      } else if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
        url.searchParams.set('ip', clientIp);
      }

      const fetchImpl = options.fetchFn || fetch;
      const response = await fetchImpl(url.toString(), {
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await response.json();
      return c.json(
        data,
        (response.status >= 200 && response.status < 600 ? response.status : 200) as 200
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to query IP2Location';
      return c.json({ error: message }, 502);
    }
  });

  app.route('/api/v1', v1);

  return app;
}
