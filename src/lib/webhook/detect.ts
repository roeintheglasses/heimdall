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

async function detectGitHub(input: DetectInput): Promise<DetectResult> {
  const name = input.githubEvent ?? '';
  if (name === 'ping') return { kind: 'pong' };
  const type = GITHUB_TYPES[name];
  if (!type) return { kind: 'ignore', reason: `unsupported github event` };
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
