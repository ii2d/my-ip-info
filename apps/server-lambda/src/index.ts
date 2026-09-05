import { handle } from 'hono/aws-lambda';
import { createIpApp } from '@my-ip/core';

const app = createIpApp({
  providerName: 'aws-lambda',
});

export const handler = handle(app);
