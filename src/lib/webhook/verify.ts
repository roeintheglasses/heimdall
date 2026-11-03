const encoder = new TextEncoder();

/** Decode a hex string to bytes. Returns null for odd length or non-hex input. */
export function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Constant-time string comparison. Both inputs are hashed with SHA-256 so the
 * comparison runs over equal-length digests regardless of input length.
 */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) {
    diff |= x[i] ^ y[i];
  }
  return diff === 0;
}

async function verifyHmac(
  hash: 'SHA-256' | 'SHA-1',
  secret: string,
  hexSignature: string,
  body: string
): Promise<boolean> {
  const sigBytes = hexToBytes(hexSignature);
  if (!sigBytes) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash },
    false,
    ['verify']
  );
  // crypto.subtle.verify compares in constant time.
  return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body));
}

/** GitHub: `x-hub-signature-256: sha256=<hex HMAC-SHA256 of the raw body>`. */
export async function verifyGitHub(
  body: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  return verifyHmac('SHA-256', secret, signatureHeader.slice('sha256='.length), body);
}

/** Vercel: `x-vercel-signature: <hex HMAC-SHA1 of the raw body>`. */
export async function verifyVercel(
  body: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false;
  return verifyHmac('SHA-1', secret, signatureHeader, body);
}

/** Railway is unsigned: the shared token travels in the webhook URL query string. */
export async function verifyRailwayToken(token: string | null, expected: string): Promise<boolean> {
  if (token === null) return false;
  return safeEqual(token, expected);
}
