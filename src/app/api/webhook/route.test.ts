/** @jest-environment node */
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

const publishJSON = jest.fn();
jest.mock('@upstash/qstash', () => ({
  Client: jest.fn().mockImplementation(() => ({ publishJSON })),
}));

import { POST } from './route';

const env = process.env as Record<string, string | undefined>;
const original = { ...process.env };

const sign = (body: string, secret = 'ghsecret') =>
  'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

function request(body: string, headers: Record<string, string>, query = '') {
  return new NextRequest(`http://localhost/api/webhook${query}`, {
    method: 'POST',
    headers,
    body,
  });
}

let logSpy: jest.SpyInstance;

beforeEach(() => {
  publishJSON.mockReset();
  env.WEBHOOK_SECRET = 'ghsecret';
  env.VERCEL_WEBHOOK_SECRET = 'vsecret';
  env.RAILWAY_WEBHOOK_TOKEN = 'rtoken';
  env.BACKEND_WEBHOOK_SECRET = 'bsecret';
  env.GO_SERVICE_URL = 'http://go.test';
  delete env.QSTASH_TOKEN;
  global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 })) as any;
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  for (const k of Object.keys(process.env)) delete env[k];
  Object.assign(process.env, original);
  jest.restoreAllMocks();
});

const ghHeaders = (body: string, event = 'push') => ({
  'x-github-event': event,
  'x-github-delivery': 'del-1',
  'x-hub-signature-256': sign(body),
});

describe('POST /api/webhook', () => {
  it('forwards a signed GitHub push with the envelope and secret header', async () => {
    const body = JSON.stringify({ repository: { name: 'r' } });
    const res = await POST(request(body, ghHeaders(body)));
    expect(res.status).toBe(200);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://go.test/api/webhook');
    expect(init.headers['X-Heimdall-Secret']).toBe('bsecret');
    const sent = JSON.parse(init.body);
    expect(sent.type).toBe('github.push');
    expect(sent.delivery_id).toBe('github:del-1');
    expect(typeof sent.timestamp).toBe('number');
    expect(sent.timestamp).toBeLessThan(1e11);
    expect(sent.event).toEqual({ repository: { name: 'r' } });
  });

  it('uses QStash when configured and sends no delay', async () => {
    env.QSTASH_TOKEN = 'qt';
    publishJSON.mockResolvedValue({ messageId: 'm' });
    const body = '{"a":1}';
    const res = await POST(request(body, ghHeaders(body)));
    expect(res.status).toBe(200);
    expect(publishJSON.mock.calls[0][0].headers['X-Heimdall-Secret']).toBe('bsecret');
    expect(publishJSON.mock.calls[0][0]).not.toHaveProperty('delay');
  });

  it('answers ping with 200 and forwards nothing', async () => {
    const body = '{"zen":"x"}';
    const res = await POST(request(body, ghHeaders(body, 'ping')));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('pong');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('answers unsupported GitHub events with 202 ignored', async () => {
    const body = '{}';
    const res = await POST(request(body, ghHeaders(body, 'create')));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ status: 'ignored' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects bad or missing GitHub signatures with 401', async () => {
    const body = '{}';
    const bad = await POST(
      request(body, { 'x-github-event': 'push', 'x-hub-signature-256': sign(body, 'wrong') })
    );
    expect(bad.status).toBe(401);
    const missing = await POST(request(body, { 'x-github-event': 'push' }));
    expect(missing.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 500 when the GitHub secret is not configured', async () => {
    delete env.WEBHOOK_SECRET;
    const body = '{}';
    const res = await POST(request(body, ghHeaders(body)));
    expect(res.status).toBe(500);
  });

  it('returns 401 with no credentials', async () => {
    const res = await POST(request('{}', {}));
    expect(res.status).toBe(401);
  });

  it('authenticates Vercel by HMAC-SHA1 and forwards deploys', async () => {
    const body = JSON.stringify({ type: 'deployment.created', id: 'evt1', payload: {} });
    const sig = createHmac('sha1', 'vsecret').update(body).digest('hex');
    const ok = await POST(request(body, { 'x-vercel-signature': sig }));
    expect(ok.status).toBe(200);
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).delivery_id).toBe(
      'vercel:evt1'
    );
    const bad = await POST(request(body, { 'x-vercel-signature': 'deadbeef' }));
    expect(bad.status).toBe(401);
  });

  it('authenticates Railway by token query param', async () => {
    const body = JSON.stringify({ type: 'DEPLOY', deployment: { id: 'd' } });
    const ok = await POST(request(body, {}, '?token=rtoken'));
    expect(ok.status).toBe(200);
    const bad = await POST(request(body, {}, '?token=nope'));
    expect(bad.status).toBe(401);
  });

  it('does not let a Railway token authenticate a GitHub-shaped request', async () => {
    const body = '{}';
    const res = await POST(request(body, { 'x-github-event': 'push' }, '?token=rtoken'));
    expect(res.status).toBe(401);
  });

  it('returns 400 for malformed JSON and non-object payloads', async () => {
    const bad = '{not json';
    expect((await POST(request(bad, ghHeaders(bad)))).status).toBe(400);
    const arr = '[1,2]';
    expect((await POST(request(arr, ghHeaders(arr)))).status).toBe(400);
    const nul = 'null';
    expect((await POST(request(nul, ghHeaders(nul)))).status).toBe(400);
  });

  it('returns 413 for oversized bodies by header and by actual size', async () => {
    const big = 'x'.repeat(1024 * 1024 + 1);
    const byHeader = await POST(
      request('{}', { ...ghHeaders('{}'), 'content-length': String(big.length) })
    );
    expect(byHeader.status).toBe(413);
    const byBody = await POST(request(big, ghHeaders(big)));
    expect(byBody.status).toBe(413);
  });

  it('maps backend failures to 400, 502 and 500', async () => {
    const body = '{}';
    (global.fetch as jest.Mock).mockResolvedValueOnce(new Response('', { status: 400 }));
    expect((await POST(request(body, ghHeaders(body)))).status).toBe(400);
    (global.fetch as jest.Mock).mockResolvedValueOnce(new Response('', { status: 500 }));
    expect((await POST(request(body, ghHeaders(body)))).status).toBe(502);
    delete env.BACKEND_WEBHOOK_SECRET;
    expect((await POST(request(body, ghHeaders(body)))).status).toBe(500);
  });

  it('logs only allowlisted fields', async () => {
    const body = '{"secret_field":"leak"}';
    await POST(request(body, ghHeaders(body)));
    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toContain('leak');
    expect(logged).not.toContain('sha256=');
    expect(Object.keys(logSpy.mock.calls[0][1]).sort()).toEqual(
      ['bodyBytes', 'deliveryId', 'eventType', 'ms', 'provider', 'status'].sort()
    );
  });
});
