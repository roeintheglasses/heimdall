/** @jest-environment node */
import { createHmac } from 'crypto';
import { hexToBytes, safeEqual, verifyGitHub, verifyRailwayToken, verifyVercel } from './verify';

const body = '{"hello":"world"}';
const secret = 'topsecret';

const hmac = (algo: 'sha256' | 'sha1', key: string, data: string) =>
  createHmac(algo, key).update(data).digest('hex');

describe('verifyGitHub', () => {
  it('accepts a valid signature', async () => {
    const sig = 'sha256=' + hmac('sha256', secret, body);
    await expect(verifyGitHub(body, sig, secret)).resolves.toBe(true);
  });

  it('rejects a signature made with another secret', async () => {
    const sig = 'sha256=' + hmac('sha256', 'other', body);
    await expect(verifyGitHub(body, sig, secret)).resolves.toBe(false);
  });

  it('rejects a tampered body', async () => {
    const sig = 'sha256=' + hmac('sha256', secret, body);
    await expect(verifyGitHub(body + ' ', sig, secret)).resolves.toBe(false);
  });

  it('rejects missing, unprefixed, non-hex and short signatures', async () => {
    const hex = hmac('sha256', secret, body);
    await expect(verifyGitHub(body, null, secret)).resolves.toBe(false);
    await expect(verifyGitHub(body, hex, secret)).resolves.toBe(false);
    await expect(verifyGitHub(body, 'sha256=zzzz', secret)).resolves.toBe(false);
    await expect(verifyGitHub(body, 'sha256=' + hex.slice(0, 10), secret)).resolves.toBe(false);
    await expect(verifyGitHub(body, 'sha256=', secret)).resolves.toBe(false);
  });
});

describe('verifyVercel', () => {
  it('accepts a valid HMAC-SHA1 signature', async () => {
    await expect(verifyVercel(body, hmac('sha1', secret, body), secret)).resolves.toBe(true);
  });

  it('rejects invalid, missing and wrong-secret signatures', async () => {
    await expect(verifyVercel(body, hmac('sha1', 'other', body), secret)).resolves.toBe(false);
    await expect(verifyVercel(body, 'nothex', secret)).resolves.toBe(false);
    await expect(verifyVercel(body, null, secret)).resolves.toBe(false);
  });
});

describe('verifyRailwayToken', () => {
  it('accepts the exact token only', async () => {
    await expect(verifyRailwayToken('abc', 'abc')).resolves.toBe(true);
    await expect(verifyRailwayToken('abd', 'abc')).resolves.toBe(false);
    await expect(verifyRailwayToken('', 'abc')).resolves.toBe(false);
    await expect(verifyRailwayToken(null, 'abc')).resolves.toBe(false);
  });
});

describe('safeEqual', () => {
  it('compares strings of any length', async () => {
    await expect(safeEqual('a', 'a')).resolves.toBe(true);
    await expect(safeEqual('a', 'b')).resolves.toBe(false);
    await expect(safeEqual('a', 'aa')).resolves.toBe(false);
    await expect(safeEqual('', '')).resolves.toBe(true);
  });
});

describe('hexToBytes', () => {
  it('decodes valid hex and rejects bad input', () => {
    expect(Array.from(hexToBytes('00ff10')!)).toEqual([0, 255, 16]);
    expect(hexToBytes('abc')).toBeNull();
    expect(hexToBytes('xx')).toBeNull();
    expect(hexToBytes('')).toBeNull();
  });
});
