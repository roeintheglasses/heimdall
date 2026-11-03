/**
 * Returns the Go backend service URL without a trailing slash.
 * Outside production it falls back to http://localhost:8080. In production it
 * throws when neither GO_SERVICE_URL nor NEXT_PUBLIC_GO_SERVICE_URL is set.
 */
export function getGoServiceUrl(): string {
  const configured = process.env.GO_SERVICE_URL || process.env.NEXT_PUBLIC_GO_SERVICE_URL;
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:8080';
  }
  throw new Error('GO_SERVICE_URL is not configured');
}
