/**
 * In-memory access-token holder for the HTTP client.
 * AuthProvider is the primary writer; api.ts / sessionRefresh are readers/writers.
 */

let accessToken: string | null = null

type InvalidationListener = () => void
const invalidationListeners = new Set<InvalidationListener>()

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

/**
 * Subscribe to access-token invalidation (failed refresh / forced clear).
 * Used by AuthProvider to drop React session state without circular imports.
 */
export function onAccessTokenInvalidated(
  listener: InvalidationListener,
): () => void {
  invalidationListeners.add(listener)
  return () => {
    invalidationListeners.delete(listener)
  }
}

/** Clear the in-memory access token and notify session listeners. */
export function invalidateAccessToken(): void {
  accessToken = null
  for (const listener of invalidationListeners) {
    listener()
  }
}
