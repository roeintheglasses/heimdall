import { sha256Hex } from './verify';

export type Provider = 'github' | 'vercel' | 'railway';

export type DetectResult =
  | { kind: 'forward'; type: string; deliveryId: string }
  | { kind: 'ignore'; reason: string }
  | { kind: 'pong' };

export interface DetectInput {
  provider: Provider;
  payload: Record<string, unknown>;
  rawBody: string;
  /** Value of the x-github-event header (GitHub only). */
  githubEvent?: string | null;
  /** Value of the x-github-delivery header (GitHub only). */
  githubDelivery?: string | null;
}

const MAX_DELIVERY_ID = 255;

const GITHUB_TYPES: Record<string, string> = {
  push: 'github.push',
  pull_request: 'github.pr',
  issues: 'github.issue',
  release: 'github.release',
};

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function bodyHashId(rawBody: string): Promise<string> {
  return sha256Hex(rawBody).then((h) => `sha256:${h}`);
}

function clamp(id: string): string {
  return id.length > MAX_DELIVERY_ID ? id.slice(0, MAX_DELIVERY_ID) : id;
}

function railwayDeployment(payload: Record<string, unknown>): Record<string, unknown> | null {
  const candidates = [
    payload.deployment,
    isObject(payload.data) ? payload.data.deployment : undefined,
    isObject(payload.resource) ? payload.resource.deployment : undefined,
  ];
  for (const c of candidates) {
    if (isObject(c)) return c;
  }
  return null;
}

function isRailwayDeploy(payload: Record<string, unknown>): boolean {
  const type = payload.type;
  if (typeof type === 'string' && type.toLowerCase().includes('deploy')) return true;
  const event = payload.event;
  if (typeof event === 'string' && event.toLowerCase().includes('deploy')) return true;
  return railwayDeployment(payload) !== null;
}

const CI_FAILURE_CONCLUSIONS = new Set(['failure', 'timed_out', 'cancelled']);

/**
 * Only completed runs that did not succeed become error.ci events. The id is built
 * from the run, so two hooks on one repo, or a redelivery, collapse into one event,
 * while a re-run (new run_attempt) is a new one.
 */
async function detectWorkflowRun(input: DetectInput): Promise<DetectResult> {
  const { payload } = input;
  const run = isObject(payload.workflow_run) ? payload.workflow_run : null;
  const conclusion = run ? str(run.conclusion) : '';
  if (payload.action !== 'completed' || !run || !CI_FAILURE_CONCLUSIONS.has(conclusion)) {
    return { kind: 'ignore', reason: 'workflow_run is not a completed failure' };
  }
  const runId = typeof run.id === 'number' || typeof run.id === 'string' ? String(run.id) : '';
  const attempt =
    typeof run.run_attempt === 'number' || typeof run.run_attempt === 'string'
      ? String(run.run_attempt)
      : '1';
  if (runId) {
    return {
      kind: 'forward',
      type: 'error.ci',
      deliveryId: clamp(`github:run:${runId}:${attempt}:${conclusion}`),
    };
  }
  const delivery = input.githubDelivery?.trim();
  const deliveryId = delivery ? `github:${delivery}` : await bodyHashId(input.rawBody);
  return { kind: 'forward', type: 'error.ci', deliveryId: clamp(deliveryId) };
}

const ZERO_SHA = /^0+$/;

/**
 * Stable id for a push: two hooks on one repo send the same push with different
 * X-GitHub-Delivery values, so the id is built from what the push is instead.
 * It includes `before` so a force-push back to an earlier head is still a new
 * push, and it is hashed so long refs never truncate it. Branch deletes (all-zero
 * `after`) return null and fall back to the delivery header, since deleting the
 * same branch twice would otherwise collide.
 */
async function pushDeliveryId(payload: Record<string, unknown>): Promise<string | null> {
  const fullName = isObject(payload.repository) ? str(payload.repository.full_name) : '';
  const ref = str(payload.ref);
  const before = str(payload.before);
  const after = str(payload.after);
  if (!fullName || !ref || !before || !after || ZERO_SHA.test(after)) return null;
  const hash = await sha256Hex([fullName, ref, before, after].join('\0'));
  return `github:push:${hash}`;
}

async function detectGitHub(input: DetectInput): Promise<DetectResult> {
  const name = input.githubEvent ?? '';
  if (name === 'ping') return { kind: 'pong' };
  if (name === 'workflow_run') return detectWorkflowRun(input);
  const type = GITHUB_TYPES[name];
  if (!type) return { kind: 'ignore', reason: `unsupported github event` };
  if (name === 'push') {
    const pushId = await pushDeliveryId(input.payload);
    if (pushId) return { kind: 'forward', type, deliveryId: pushId };
  }
  const delivery = input.githubDelivery?.trim();
  const deliveryId = delivery ? `github:${delivery}` : await bodyHashId(input.rawBody);
  return { kind: 'forward', type, deliveryId: clamp(deliveryId) };
}

async function detectVercel(input: DetectInput): Promise<DetectResult> {
  const { payload } = input;
  if (typeof payload.type !== 'string' || !payload.type.startsWith('deployment.')) {
    return { kind: 'ignore', reason: 'not a vercel deployment event' };
  }
  const id = str(payload.id);
  const deliveryId = id ? `vercel:${id}` : await bodyHashId(input.rawBody);
  return { kind: 'forward', type: 'vercel.deploy', deliveryId: clamp(deliveryId) };
}

async function detectRailway(input: DetectInput): Promise<DetectResult> {
  const { payload } = input;
  if (!isRailwayDeploy(payload)) {
    return { kind: 'ignore', reason: 'not a railway deployment event' };
  }
  const deployment = railwayDeployment(payload);
  const id = str(deployment?.id);
  const details = isObject(payload.details) ? payload.details : {};
  const stage =
    str(payload.status) ||
    str(deployment?.status) ||
    str(details.status) ||
    str(payload.type) ||
    str(payload.event);
  const deliveryId = id ? `railway:${id}:${stage}` : await bodyHashId(input.rawBody);
  return { kind: 'forward', type: 'railway.deploy', deliveryId: clamp(deliveryId) };
}

/** Decide what to do with an authenticated, parsed webhook. Never throws on odd payload shapes. */
export function detectEvent(input: DetectInput): Promise<DetectResult> {
  switch (input.provider) {
    case 'github':
      return detectGitHub(input);
    case 'vercel':
      return detectVercel(input);
    case 'railway':
      return detectRailway(input);
  }
}
