/** @jest-environment node */
const publishJSON = jest.fn();
jest.mock('@upstash/qstash', () => ({
  Client: jest.fn().mockImplementation(() => ({ publishJSON })),
}));

import { buildEnvelope, forwardToBackend } from './forward';

const env = process.env as Record<string, string | undefined>;
const original = { ...process.env };
const envelope = buildEnvelope('github.push', { a: 1 }, 'github:abc', 1_730_000_123_456);

beforeEach(() => {
  publishJSON.mockReset();
  env.BACKEND_WEBHOOK_SECRET = 'bsecret';
  env.GO_SERVICE_URL = 'http://go.test/';
  delete env.QSTASH_TOKEN;
  global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 })) as any;
});

afterEach(() => {
  for (const k of Object.keys(process.env)) delete env[k];
  Object.assign(process.env, original);
});

describe('buildEnvelope', () => {
  it('uses unix seconds and includes delivery_id', () => {
    expect(envelope).toEqual({
      type: 'github.push',
      event: { a: 1 },
      timestamp: 1_730_000_123,
      delivery_id: 'github:abc',
    });
  });
});

describe('forwardToBackend', () => {
  it('fails with 500 and forwards nothing when the secret is unset', async () => {
    delete env.BACKEND_WEBHOOK_SECRET;
    env.QSTASH_TOKEN = 'qt';
    const result = await forwardToBackend(envelope);
    expect(result).toMatchObject({ ok: false, status: 500 });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(publishJSON).not.toHaveBeenCalled();
  });

  it('sends the secret header on the direct path', async () => {
    const result = await forwardToBackend(envelope);
    expect(result).toEqual({ ok: true, via: 'direct' });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://go.test/api/webhook');
    expect(init.headers['X-Heimdall-Secret']).toBe('bsecret');
    expect(JSON.parse(init.body)).toEqual(envelope);
  });

  it('publishes via QStash with the secret header, retries, and no delay', async () => {
    env.QSTASH_TOKEN = 'qt';
    publishJSON.mockResolvedValue({ messageId: 'm1' });
    const result = await forwardToBackend(envelope);
    expect(result).toEqual({ ok: true, via: 'qstash' });
    const options = publishJSON.mock.calls[0][0];
    expect(options.url).toBe('http://go.test/api/webhook');
    expect(options.headers['X-Heimdall-Secret']).toBe('bsecret');
    expect(options.retries).toBe(3);
    expect(options).not.toHaveProperty('delay');
    expect(options.body.timestamp).toBe(1_730_000_123);
    expect(options.body.delivery_id).toBe('github:abc');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to a direct call when QStash fails', async () => {
    env.QSTASH_TOKEN = 'qt';
    publishJSON.mockRejectedValue(new Error('boom'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await forwardToBackend(envelope);
    expect(result).toEqual({ ok: true, via: 'direct' });
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers['X-Heimdall-Secret']).toBe(
      'bsecret'
    );
  });

  it('maps backend 4xx to 400 and 5xx or network errors to 502', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(new Response('bad', { status: 400 }));
    expect(await forwardToBackend(envelope)).toMatchObject({ ok: false, status: 400 });
    for (const code of [401, 403, 429]) {
      (global.fetch as jest.Mock).mockResolvedValueOnce(new Response('x', { status: code }));
      expect(await forwardToBackend(envelope)).toMatchObject({ ok: false, status: 502 });
    }
    (global.fetch as jest.Mock).mockResolvedValueOnce(new Response('x', { status: 503 }));
    expect(await forwardToBackend(envelope)).toMatchObject({ ok: false, status: 502 });
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('down'));
    expect(await forwardToBackend(envelope)).toMatchObject({ ok: false, status: 502 });
  });
});
