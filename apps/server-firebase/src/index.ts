import { onRequest } from 'firebase-functions/v2/https';
import { getRequestListener } from '@hono/node-server';
import { createIpApp } from '@my-ip/core';

const app = createIpApp({
  providerName: 'firebase-functions',
});

// Export Firebase Cloud Function v2
export const api = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
  },
  getRequestListener(app.fetch)
);
