import type { ApiEnvelope, ApiErrorEnvelope, ApiFieldErrors } from '@/types/api'
import { getAccessToken } from '@/services/authToken'

/**
 * Canonical HTTP client for all backend communication.
 *
 * Architecture: Components → Hooks → Services → api.ts → Backend
 *
 * - Unwraps `{ status, message, data }` on success and returns `data`
 * - Throws `ApiError` for HTTP failures and `{ status: "error" }` bodies
 * - Supports query params, credentials (JWT refresh cookies), AbortSignal,
 *   and Authorization: Bearer when an in-memory access token is set
 *
 * Health endpoints do not use the standard envelope — pass `parseEnvelope: false`.
 */

/**
 * Normalize VITE_API_URL for both absolute origins and same-origin relative prefixes.
 * Examples: `http://localhost:5000`, `/api/v1`
 */
function normalizeApiBaseUrl(raw: string | undefined): string {
  const trimmed = raw?.trim().replace(/\/+$/, '') ?? ''
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

const configuredBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_URL)

export const API_URL = configuredBaseUrl

export class ApiError extends Error {
  readonly status: number
  readonly errors?: ApiFieldErrors
  readonly body?: unknown

  constructor(
    message: string,
    status: number,
    options?: { errors?: ApiFieldErrors; body?: unknown },
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = options?.errors
    this.body = options?.body
  }
}

export type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlyArray<string | number | boolean>

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
}

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/**
 * Join API base + endpoint without requiring an absolute URL.
 * Relative bases (e.g. `/api/v1`) stay relative so fetch remains same-origin.
 */
function joinApiPath(base: string, endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${base}${path}`
}

function buildUrl(endpoint: string, params?: Record<string, QueryParamValue>): string {
  const joined = joinApiPath(API_URL, endpoint)

  if (!params) {
    return joined
  }

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, String(item))
      }
    } else {
      search.set(key, String(value))
    }
  }

  const qs = search.toString()
  if (!qs) {
    return joined
  }

  // Preserve absolute vs relative form; never call `new URL(relative)` without a base.
  if (isAbsoluteHttpUrl(joined)) {
    const url = new URL(joined)
    url.search = qs
    return url.toString()
  }

  return `${joined}?${qs}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  return isRecord(value) && value.status === 'error' && typeof value.message === 'string'
}

function isApiSuccessEnvelope<T>(value: unknown): value is ApiEnvelope<T> & { status: 'success' } {
  return isRecord(value) && value.status === 'success'
}

function extractFieldErrors(value: unknown): ApiFieldErrors | undefined {
  if (!isRecord(value) || value.errors === undefined || value.errors === null) {
    return undefined
  }
  if (!isRecord(value.errors)) {
    return undefined
  }

  const errors: ApiFieldErrors = {}
  for (const [key, message] of Object.entries(value.errors)) {
    if (typeof message === 'string') {
      errors[key] = message
    }
  }
  return Object.keys(errors).length > 0 ? errors : undefined
}

async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return undefined
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function throwHttpError(response: Response, body: unknown): never {
  if (isApiErrorEnvelope(body)) {
    throw new ApiError(body.message, response.status, {
      errors: extractFieldErrors(body),
      body,
    })
  }

  const fallback =
    typeof body === 'string' && body.trim().length > 0
      ? body
      : `Request failed: ${response.statusText || response.status}`

  throw new ApiError(fallback, response.status, { body })
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

  const { body, params, parseEnvelope = true, headers, credentials, signal, ...rest } = options
  const token = getAccessToken()

  const response = await fetch(buildUrl(endpoint, params), {
    ...rest,
    method,
    signal,
    credentials: credentials ?? 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await readJsonBody(response)

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
