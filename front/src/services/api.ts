import { getAccessToken } from '@/services/authToken'
import {
  handleRefreshFailure,
  refreshSessionAccessToken,
} from '@/services/sessionRefresh'
import {
  ApiError,
  API_URL,
  buildUrl,
  extractFieldErrors,
  isApiErrorEnvelope,
  isApiSuccessEnvelope,
  readJsonBody,
  throwHttpError,
  type QueryParamValue,
} from '@/services/apiBase'

export { ApiError, API_URL } from '@/services/apiBase'
export type { QueryParamValue } from '@/services/apiBase'

/**
 * Canonical HTTP client for all backend communication.
 *
 * Architecture: Components → Hooks → Services → api.ts → Backend
 *
 * - Unwraps `{ status, message, data }` on success and returns `data`
 * - Throws `ApiError` for HTTP failures and `{ status: "error" }` bodies
 * - Supports query params, credentials (JWT refresh cookies), AbortSignal,
 *   and Authorization: Bearer when an in-memory access token is set
 * - On 401 for Bearer-authenticated requests: single-flight refresh + one retry
 *
 * Health endpoints do not use the standard envelope — pass `parseEnvelope: false`.
 */

export interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  /** JSON-serializable request body (sent as `application/json`). */
  body?: unknown
  /** Query string parameters. `null` / `undefined` values are omitted. */
  params?: Record<string, QueryParamValue>
  /**
   * When true (default), expect and unwrap the backend `{ status, message, data }` envelope.
   * Set to false for health endpoints and other non-envelope responses.
   */
  parseEnvelope?: boolean
  /**
   * When true, a 401 will not trigger access-token refresh/retry.
   * Use for login, logout, refresh, and other auth-establishment calls.
   */
  skipAuthRefresh?: boolean
  /**
   * Internal: marks a request that already retried after refresh.
   * Prevents infinite 401 → refresh → 401 loops.
   */
  _authRetry?: boolean
}

async function request<T>(
  method: string,
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(
      'VITE_API_URL is not configured. Set an absolute origin (e.g. http://localhost:5000) or a relative prefix (e.g. /api/v1).',
      0,
    )
  }

  const {
    body,
    params,
    parseEnvelope = true,
    headers,
    credentials,
    signal,
    skipAuthRefresh = false,
    _authRetry = false,
    ...rest
  } = options

  // Capture whether this call was authenticated with a Bearer token.
  const tokenAtSend = getAccessToken()
  const sentBearer = Boolean(tokenAtSend)

  const response = await fetch(buildUrl(endpoint, params), {
    ...rest,
    method,
    signal,
    credentials: credentials ?? 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(tokenAtSend ? { Authorization: `Bearer ${tokenAtSend}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await readJsonBody(response)

  if (
    response.status === 401 &&
    sentBearer &&
    !skipAuthRefresh &&
    !_authRetry
  ) {
    try {
      await refreshSessionAccessToken(signal ?? undefined)
    } catch (refreshError) {
      handleRefreshFailure()
      throw refreshError
    }

    // Retry once with the NEW access token from the shared store.
    return request<T>(method, endpoint, {
      ...options,
      skipAuthRefresh,
      _authRetry: true,
    })
  }

  if (!response.ok) {
    throwHttpError(response, payload)
  }

  if (!parseEnvelope) {
    return payload as T
  }

  if (payload === undefined) {
    return undefined as T
  }

  if (isApiErrorEnvelope(payload)) {
    throw new ApiError(payload.message, response.status, {
      errors: extractFieldErrors(payload),
      body: payload,
    })
  }

  if (!isApiSuccessEnvelope<T>(payload)) {
    throw new ApiError(
      'Unexpected API response: missing success envelope ({ status: "success", data }).',
      response.status,
      { body: payload },
    )
  }

  return payload.data as T
}

export const api = {
  get: <T>(endpoint: string, options?: ApiRequestOptions) =>
    request<T>('GET', endpoint, options),

  post: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>('POST', endpoint, { ...options, body }),

  put: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>('PUT', endpoint, { ...options, body }),

  patch: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>('PATCH', endpoint, { ...options, body }),

  delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
    request<T>('DELETE', endpoint, options),
}
