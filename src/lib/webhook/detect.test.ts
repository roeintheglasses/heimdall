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

  describe('push delivery id', () => {
    const push = {
      ref: 'refs/heads/main',
      before: 'aaa111',
      after: 'abc123',
      repository: { full_name: 'octo/repo' },
    };

    it('derives a fixed-length hashed id from repo, ref, before and after', async () => {
      const result = await run('github', push, { githubEvent: 'push', githubDelivery: 'd-1' });
      expect(result).toMatchObject({ kind: 'forward', type: 'github.push' });
      const id = (result as { deliveryId: string }).deliveryId;
      expect(id).toMatch(/^github:push:[0-9a-f]{64}$/);
    });

    it('treats a force-push back to an earlier head as a new push', async () => {
      const first = await run('github', push, { githubEvent: 'push', githubDelivery: 'd-1' });
      const back = await run(
        'github',
        { ...push, before: 'bbb222' },
        { githubEvent: 'push', githubDelivery: 'd-2' }
      );
      expect(first).not.toEqual(back);
    });

    it('keeps the id short for very long refs', async () => {
      const ref = `refs/heads/${'x'.repeat(400)}`;
      const a = await run('github', { ...push, ref }, { githubEvent: 'push' });
      const b = await run('github', { ...push, ref, after: 'def456' }, { githubEvent: 'push' });
      expect((a as { deliveryId: string }).deliveryId.length).toBeLessThan(80);
      expect(a).not.toEqual(b);
    });

    it('falls back to the delivery header for branch deletes', async () => {
      const del = { ...push, after: '0000000000000000000000000000000000000000' };
      const result = await run('github', del, { githubEvent: 'push', githubDelivery: 'd-9' });
      expect(result).toMatchObject({ deliveryId: 'github:d-9' });
    });

    it('gives two hooks with different delivery headers the same id', async () => {
      const a = await run('github', push, { githubEvent: 'push', githubDelivery: 'd-1' });
      const b = await run('github', push, { githubEvent: 'push', githubDelivery: 'd-2' });
      expect(a).toEqual(b);
    });

    it.each([
      ['full_name', { ...push, repository: {} }],
      ['ref', { ...push, ref: undefined }],
      ['before', { ...push, before: undefined }],
      ['after', { ...push, after: 42 }],
    ])('falls back to the delivery header without %s', async (_n, payload) => {
      const result = await run('github', payload, { githubEvent: 'push', githubDelivery: 'd-1' });
      expect(result).toMatchObject({ deliveryId: 'github:d-1' });
    });

    it('does not change ids for other event types', async () => {
      const result = await run('github', push, { githubEvent: 'issues', githubDelivery: 'd-1' });
      expect(result).toMatchObject({ deliveryId: 'github:d-1' });
    });
  });

  describe('workflow_run', () => {
    const wf = (conclusion: unknown, action = 'completed', extra: object = {}) => ({
      action,
      workflow_run: { id: 77, run_attempt: 2, conclusion, ...extra },
    });

    it.each(['failure', 'timed_out', 'cancelled'])(
      'forwards a completed %s run as error.ci',
      async (c) => {
        const result = await run('github', wf(c), {
          githubEvent: 'workflow_run',
          githubDelivery: 'd-1',
        });
        expect(result).toEqual({
          kind: 'forward',
          type: 'error.ci',
          deliveryId: `github:run:77:2:${c}`,
        });
      }
    );

    it.each([
      ['success', 'completed'],
      ['skipped', 'completed'],
      [null, 'completed'],
      ['failure', 'requested'],
      ['failure', 'in_progress'],
    ])('ignores conclusion %s with action %s', async (c, action) => {
      const result = await run('github', wf(c, action), { githubEvent: 'workflow_run' });
      expect(result.kind).toBe('ignore');
    });

    it('ignores a payload without workflow_run', async () => {
      const result = await run('github', { action: 'completed' }, { githubEvent: 'workflow_run' });
      expect(result.kind).toBe('ignore');
    });

    it('falls back to the delivery header when the run has no id', async () => {
      const result = await run(
        'github',
        { action: 'completed', workflow_run: { conclusion: 'failure' } },
        { githubEvent: 'workflow_run', githubDelivery: 'd-5' }
      );
      expect(result).toEqual({ kind: 'forward', type: 'error.ci', deliveryId: 'github:d-5' });
    });
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
