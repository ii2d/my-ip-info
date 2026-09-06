import { createIpApp } from './app';
import { extractClientIp } from './extractors';
import { isCliRequest } from './formatters';

export interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const app = createIpApp({
  providerName: 'cloudflare-worker',
});

type WorkerContext = Parameters<typeof app.fetch>[2];

export default {
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';
    const accept = request.headers.get('accept') || '';

    // CLI clients (curl, wget, httpie, etc.) requesting root '/' get plain text IP
    if (url.pathname === '/' && isCliRequest(userAgent, accept)) {
      const clientIp = extractClientIp(request.headers);
      return new Response(`${clientIp}\n`, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Client-IP': clientIp,
        },
      });
    }

    // Shorthand /ip endpoint for CLI or plain reflection
    if (url.pathname === '/ip') {
      const clientIp = extractClientIp(request.headers);
      return new Response(`${clientIp}\n`, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Client-IP': clientIp,
        },
      });
    }

    // API routes handled by Hono (/api/v1/*)
    if (url.pathname.startsWith('/api')) {
      return app.fetch(request, env, ctx);
    }

    // Serve static assets (React SPA) via Cloudflare Assets binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return app.fetch(request, env, ctx);
  },
};
