import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getIpVersion, isBogonIp } from './ip';
import { extractClientIp, extractCloudflareGeo } from './extractors';
import { formatPlaintext, formatYaml, isCliRequest } from './formatters';
import { CloudflareCfData, IpInfoResponse } from './types';

export interface CreateAppOptions {
  providerName?: string;
  defaultGeo?: (ip: string) => Promise<IpInfoResponse['geo'] | undefined>;
}

export function createIpApp(options: CreateAppOptions = {}) {
  const providerName = options.providerName || 'generic-serverless';
  const app = new Hono();

  // Enable CORS for all routes
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'HEAD', 'OPTIONS'],
    allowHeaders: ['*'],
    exposeHeaders: ['Content-Length', 'X-Client-IP'],
    maxAge: 86400,
  }));

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
      protocol: runtimeProtocol || (reqHeaders.get('x-forwarded-proto') || 'https'),
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

  // Health check
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      provider: providerName,
      timestamp: new Date().toISOString(),
    });
  });

  // Plain IP endpoint
  app.get('/ip', (c) => {
    // @ts-expect-error - Cloudflare raw request binding if available
    const cf = c.req.raw?.cf as CloudflareCfData | undefined;
    const clientIp = extractClientIp(c.req.raw.headers);
    c.header('Content-Type', 'text/plain; charset=utf-8');
    c.header('X-Client-IP', clientIp);
    return c.text(`${clientIp}\n`);
  });

  // Dedicated JSON endpoint
  app.get('/json', async (c) => {
    // @ts-expect-error - Cloudflare raw request binding if available
    const cf = c.req.raw?.cf as CloudflareCfData | undefined;
    const clientIp = extractClientIp(c.req.raw.headers);
    const data = buildIpResponse(clientIp, c.req.raw.headers, cf);
    c.header('X-Client-IP', clientIp);
    return c.json(data);
  });

  // Dedicated Geo endpoint
  app.get('/geo', async (c) => {
    // @ts-expect-error - Cloudflare raw request binding if available
    const cf = c.req.raw?.cf as CloudflareCfData | undefined;
    const clientIp = extractClientIp(c.req.raw.headers);
    const data = buildIpResponse(clientIp, c.req.raw.headers, cf);
    c.header('X-Client-IP', clientIp);
    return c.json(data.geo || { error: 'No geo data available for this provider' });
  });

  // Dedicated YAML endpoint
  app.get('/yaml', async (c) => {
    // @ts-expect-error - Cloudflare raw request binding if available
    const cf = c.req.raw?.cf as CloudflareCfData | undefined;
    const clientIp = extractClientIp(c.req.raw.headers);
    const data = buildIpResponse(clientIp, c.req.raw.headers, cf);
    c.header('Content-Type', 'text/yaml; charset=utf-8');
    c.header('X-Client-IP', clientIp);
    return c.text(formatYaml(data));
  });

  // Root endpoint: smart format based on client (curl vs browser vs json header)
  app.get('/', async (c) => {
    const rawHeaders = c.req.raw.headers;
    // @ts-expect-error - Cloudflare raw request binding if available
    const cf = c.req.raw?.cf as CloudflareCfData | undefined;
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
      c.header('Content-Type', 'text/yaml; charset=utf-8');
      return c.text(formatYaml(data));
    }
    if (formatQuery === 'text' || formatQuery === 'ip' || isCliRequest(ua, accept)) {
      c.header('Content-Type', 'text/plain; charset=utf-8');
      return c.text(formatPlaintext(data));
    }

    // Default to JSON for browser requests unless specified otherwise
    return c.json(data);
  });

  return app;
}
