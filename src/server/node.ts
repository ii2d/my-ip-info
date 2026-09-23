import { serve } from '@hono/node-server';
import { createIpApp } from './app';

try {
  (process as unknown as { loadEnvFile?: () => void }).loadEnvFile?.();
} catch {
  // Ignore if .env is missing or loadEnvFile is not supported
}

const port = Number(process.env.PORT) || 3000;
const app = createIpApp({
  providerName: 'node-standalone',
});

console.log(`🌐 my-ip-info server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
