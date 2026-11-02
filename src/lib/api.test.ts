import { getGoServiceUrl } from './api';

const env = process.env as Record<string, string | undefined>;
const original = { ...process.env };

afterEach(() => {
  for (const k of Object.keys(process.env)) delete env[k];
  Object.assign(process.env, original);
});

describe('getGoServiceUrl', () => {
  beforeEach(() => {
    delete env.GO_SERVICE_URL;
    delete env.NEXT_PUBLIC_GO_SERVICE_URL;
  });

  it('prefers GO_SERVICE_URL and strips trailing slashes', () => {
    env.GO_SERVICE_URL = 'https://a.example.com//';
    env.NEXT_PUBLIC_GO_SERVICE_URL = 'https://b.example.com';
    expect(getGoServiceUrl()).toBe('https://a.example.com');
  });

  it('falls back to NEXT_PUBLIC_GO_SERVICE_URL', () => {
    env.NEXT_PUBLIC_GO_SERVICE_URL = 'https://b.example.com/';
    expect(getGoServiceUrl()).toBe('https://b.example.com');
  });

  it('falls back to localhost outside production', () => {
    env.NODE_ENV = 'development';
    expect(getGoServiceUrl()).toBe('http://localhost:8080');
  });

  it('throws in production when unset', () => {
    env.NODE_ENV = 'production';
    expect(() => getGoServiceUrl()).toThrow('GO_SERVICE_URL is not configured');
  });
});
