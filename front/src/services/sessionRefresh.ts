import { getCookie } from '@/utils/cookie'
import { invalidateAccessToken, setAccessToken } from '@/services/authToken'
import {
  ApiError,
  API_URL,
  buildUrl,
  isApiSuccessEnvelope,
  readJsonBody,
  throwHttpError,
} from '@/services/apiBase'

/** Flask-JWT-Extended refresh CSRF cookie (non-HttpOnly when CSRF protect is on). */
export const REFRESH_CSRF_COOKIE_NAME = 'csrf_refresh_token'

/** Header expected by Flask-JWT-Extended for cookie-authenticated refresh. */
export const REFRESH_CSRF_HEADER_NAME = 'X-CSRF-TOKEN'

export interface RefreshAccessTokenResult {
  access_token: string
}

type RefreshRunner = (signal?: AbortSignal) => Promise<RefreshAccessTokenResult>

let inFlightRefresh: Promise<RefreshAccessTokenResult> | null = null

/**
 * Low-level CSRF-aware refresh using fetch (not api.request) so 401 recovery
 * cannot recurse into itself.
 */
export async function executeRefreshRequest(
  signal?: AbortSignal,
): Promise<RefreshAccessTokenResult> {
  if (!API_URL) {
    throw new ApiError(
      'VITE_API_URL is not configured. Set an absolute origin (e.g. http://localhost:5000) or a relative prefix (e.g. /api/v1).',
      0,
    )
  }

  // Reread on every refresh — never permanently cache CSRF values.
  const csrfToken = getCookie(REFRESH_CSRF_COOKIE_NAME)

  const response = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    signal,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(csrfToken ? { [REFRESH_CSRF_HEADER_NAME]: csrfToken } : {}),
    },
  })

  const payload = await readJsonBody(response)

  if (!response.ok) {
    throwHttpError(response, payload)
  }

  if (!isApiSuccessEnvelope<{ access_token?: unknown }>(payload)) {
    throw new ApiError(
      'Unexpected API response: missing success envelope ({ status: "success", data }).',
      response.status,
      { body: payload },
    )
  }

  const access_token = payload.data?.access_token
  if (typeof access_token !== 'string' || !access_token) {
    throw new ApiError(
      'Unexpected API response: refresh did not return an access_token.',
      response.status,
      { body: payload },
    )
  }

  setAccessToken(access_token)
  return { access_token }
}

/**
 * Single-flight refresh: concurrent callers share one POST /auth/refresh.
 */
export function refreshSessionAccessToken(
  signal?: AbortSignal,
  runner: RefreshRunner = executeRefreshRequest,
): Promise<RefreshAccessTokenResult> {
  if (!inFlightRefresh) {
    inFlightRefresh = runner(signal).finally(() => {
      inFlightRefresh = null
    })
  }
  return inFlightRefresh
}

/**
 * After a failed refresh during 401 recovery: drop the access token and notify
 * AuthProvider so the UI does not remain "authenticated" with a dead session.
 */
export function handleRefreshFailure(): void {
  invalidateAccessToken()
}

/** Test helper — reset single-flight state between cases. */
export function __resetRefreshFlightForTests(): void {
  inFlightRefresh = null
}
