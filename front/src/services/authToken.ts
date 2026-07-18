/**
 * In-memory access-token holder for the HTTP client.
 * AuthProvider is the only writer; api.ts is the primary reader.
 */

let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}
