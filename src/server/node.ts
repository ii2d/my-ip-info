import { serve } from '@hono/node-server';
import { createIpApp } from './app';

const port = Number(process.env.PORT) || 3000;
const app = createIpApp({
  providerName: 'node-standalone',
});

console.log(`🌐 my-ip-info server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
