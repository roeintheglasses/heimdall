/** @jest-environment node */
import { detectEvent } from './detect';

const run = (provider: 'github' | 'vercel' | 'railway', payload: any, extra: object = {}) =>
  detectEvent({ provider, payload, rawBody: JSON.stringify(payload), ...extra });

describe('detectEvent github', () => {
  it('returns pong for ping', async () => {
    await expect(run('github', {}, { githubEvent: 'ping' })).resolves.toEqual({ kind: 'pong' });
  });

  it.each([
    ['push', 'github.push'],
    ['pull_request', 'github.pr'],
    ['issues', 'github.issue'],
    ['release', 'github.release'],
  ])('maps %s to %s with a delivery id', async (name, type) => {
    const result = await run('github', {}, { githubEvent: name, githubDelivery: 'abc-123' });
    expect(result).toEqual({ kind: 'forward', type, deliveryId: 'github:abc-123' });
  });

  it('ignores unsupported events such as create', async () => {
    const result = await run('github', {}, { githubEvent: 'create' });
    expect(result.kind).toBe('ignore');
  });

  it('falls back to a body hash when the delivery header is missing', async () => {
    const result = await run('github', { a: 1 }, { githubEvent: 'push' });
    expect(result.kind === 'forward' && result.deliveryId).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe('detectEvent vercel', () => {
  it('forwards deployment events with the payload id', async () => {
    const result = await run('vercel', { type: 'deployment.created', id: 'evt_1' });
    expect(result).toEqual({ kind: 'forward', type: 'vercel.deploy', deliveryId: 'vercel:evt_1' });
  });

  it('ignores non-deployment events', async () => {
    expect((await run('vercel', { type: 'project.created' })).kind).toBe('ignore');
    expect((await run('vercel', {})).kind).toBe('ignore');
    expect((await run('vercel', { type: 5 })).kind).toBe('ignore');
  });
});

describe('detectEvent railway', () => {
  it('detects shape A (legacy)', async () => {
    const result = await run('railway', {
      type: 'DEPLOY',
      status: 'FAILED',
      deployment: { id: 'd1' },
    });
    expect(result).toEqual({
      kind: 'forward',
      type: 'railway.deploy',
      deliveryId: 'railway:d1:FAILED',
    });
  });

  it('detects shape B (event + data.deployment)', async () => {
    const result = await run('railway', {
      event: 'deployment.completed',
      data: { deployment: { id: 'd2', status: 'DEPLOYED' } },
    });
    expect(result).toEqual({
      kind: 'forward',
      type: 'railway.deploy',
      deliveryId: 'railway:d2:DEPLOYED',
    });
  });

  it('detects shape C (type + resource.deployment)', async () => {
    const result = await run('railway', {
      type: 'Deployment.failed',
      resource: { deployment: { id: 'd3' } },
    });
    expect(result).toEqual({
      kind: 'forward',
      type: 'railway.deploy',
      deliveryId: 'railway:d3:Deployment.failed',
    });
  });

  it('detects a bare deployment object and hashes the body without an id', async () => {
    const result = await run('railway', { deployment: {} });
    expect(result.kind === 'forward' && result.deliveryId).toMatch(/^sha256:/);
  });

  it('does not crash when payload.event is an object', async () => {
    expect((await run('railway', { event: { name: 'x' } })).kind).toBe('ignore');
  });

  it('ignores unrelated payloads and non-object deployment values', async () => {
    expect((await run('railway', { type: 'ALERT' })).kind).toBe('ignore');
    expect((await run('railway', { deployment: 'x', data: [], resource: null })).kind).toBe(
      'ignore'
    );
  });

  it('caps delivery ids at 255 characters', async () => {
    const result = await run('railway', {
      type: 'DEPLOY',
      deployment: { id: 'x'.repeat(400) },
    });
    expect(result.kind === 'forward' && result.deliveryId.length).toBe(255);
  });
});
