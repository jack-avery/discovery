/**
 * Backend response envelope contract (utils.ok / utils.err).
 *
 * Success: { status: "success", message, data }
 * Failure: { status: "error", message, errors? }
 *
 * Health endpoints (`/health`, `/health/db`) are an intentional exception and
 * do not use this envelope — call them with `parseEnvelope: false`.
 */

export interface ApiSuccessEnvelope<T> {
  status: 'success'
  message: string
  data: T
}

/** Field-level validation map returned by some 422 responses. */
export type ApiFieldErrors = Record<string, string>

export interface ApiErrorEnvelope {
  status: 'error'
  message: string
  errors?: ApiFieldErrors
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope
