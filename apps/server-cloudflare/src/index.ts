import { createIpApp } from '@my-ip/core';

const app = createIpApp({
  providerName: 'cloudflare-worker',
});

export default app;
