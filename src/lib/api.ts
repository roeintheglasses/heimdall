/**
 * Returns the Go backend service URL.
 * Falls back to production URL if environment variables are not set.
 */
export function getGoServiceUrl(): string {
  return (
    process.env.GO_SERVICE_URL ||
    process.env.NEXT_PUBLIC_GO_SERVICE_URL ||
    'https://heimdall-backend-prod.up.railway.app'
  );
}
