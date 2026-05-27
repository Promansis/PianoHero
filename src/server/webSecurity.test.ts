// @vitest-environment node

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { createApiAccessGate } from './webSecurity';

function makeApp(secret?: string) {
  const app = new Hono();
  app.use('/api/*', createApiAccessGate(secret));
  app.get('/api/ping', (c) => c.json({ ok: true }));
  return app;
}

describe('webSecurity', () => {
  it('allows API requests when no access token is configured', async () => {
    const app = makeApp();

    const response = await app.request('/api/ping');

    expect(response.status).toBe(200);
  });

  it('denies API requests without the configured access token', async () => {
    const app = makeApp('secret-token');

    const response = await app.request('/api/ping');
    const payload = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toMatch(/access token/i);
  });

  it('allows API requests with the configured access token and sets a scoped cookie', async () => {
    const app = makeApp('secret-token');

    const response = await app.request('/api/ping', {
      headers: { 'x-pianohero-access-token': 'secret-token' },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('Path=/api');
  });

  it('allows follow-up API requests with the scoped access cookie', async () => {
    const app = makeApp('secret-token');

    const response = await app.request('/api/ping', {
      headers: { cookie: 'pianohero_web_access=secret-token' },
    });

    expect(response.status).toBe(200);
  });
});
