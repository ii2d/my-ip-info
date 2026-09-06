import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { getIpVersion, isBogonIp } from '../shared/ip';
import type { CloudflareCfData, IpInfoResponse } from '../shared/types';
import { extractClientIp, extractCloudflareGeo } from './extractors';
import { formatPlaintext, formatYaml, isCliRequest } from './formatters';

export interface CreateAppOptions {
  providerName?: string;
  defaultGeo?: (ip: string) => Promise<IpInfoResponse['geo'] | undefined>;
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
    c.header('Content-Type', 'text/yaml; charset=utf-8');
    c.header('X-Client-IP', clientIp);
    return c.text(formatYaml(data));
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
      c.header('Content-Type', 'text/yaml; charset=utf-8');
      return c.text(formatYaml(data));
    }
    if (formatQuery === 'text' || formatQuery === 'ip' || isCliRequest(ua, accept)) {
      c.header('Content-Type', 'text/plain; charset=utf-8');
      return c.text(formatPlaintext(data));
    }

    // Default to JSON for browser and API requests
    return c.json(data);
  });

  app.route('/api/v1', v1);

  return app;
}
