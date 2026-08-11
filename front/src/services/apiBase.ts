import type { ApiEnvelope, ApiErrorEnvelope, ApiFieldErrors } from '@/types/api'

/**
 * Shared API primitives used by `api.ts` and `sessionRefresh.ts`
 * without introducing circular imports.
 */

/**
 * Normalize VITE_API_URL for both absolute origins and same-origin relative prefixes.
 * Examples: `http://localhost:5000`, `/api/v1`
 */
export function normalizeApiBaseUrl(raw: string | undefined): string {
  const trimmed = raw?.trim().replace(/\/+$/, '') ?? ''
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export const API_URL = normalizeApiBaseUrl(
  import.meta.env?.VITE_API_URL ??
    (typeof process !== 'undefined' ? process.env.VITE_API_URL : undefined),
)

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

export function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

export function joinApiPath(base: string, endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${base}${path}`
}

export function buildUrl(
  endpoint: string,
  params?: Record<string, QueryParamValue>,
): string {
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

  if (isAbsoluteHttpUrl(joined)) {
    const url = new URL(joined)
    url.search = qs
    return url.toString()
  }

  return `${joined}?${qs}`
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  return (
    isRecord(value) && value.status === 'error' && typeof value.message === 'string'
  )
}

export function isApiSuccessEnvelope<T>(
  value: unknown,
): value is ApiEnvelope<T> & { status: 'success' } {
  return isRecord(value) && value.status === 'success'
}

export function extractFieldErrors(value: unknown): ApiFieldErrors | undefined {
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

export async function readJsonBody(response: Response): Promise<unknown> {
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

export function throwHttpError(response: Response, body: unknown): never {
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
