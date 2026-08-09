import { ApiError } from '@/services/api'

const TECHNICAL_MESSAGE_PATTERN =
  /sqlstate|sqlalchemy|traceback|stack trace|internal server error|exception|operationalerror|integrityerror|typeerror|referenceerror|syntaxerror|failed to fetch|networkerror|econnrefused|enotfound|etimedout|unexpected token|json\.parse|werkzeug|flask|psycopg|mysql|pymysql|vite_api_url|request failed:\s*\d+/i

/**
 * True when a message looks like a technical/backend dump unsuitable for UI.
 */
export function looksLikeTechnicalErrorMessage(message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return true
  if (TECHNICAL_MESSAGE_PATTERN.test(trimmed)) return true
  if (trimmed.length > 280) return true
  // HTML error pages / raw status lines
  if (/^<!DOCTYPE|^<html/i.test(trimmed)) return true
  return false
}

/**
 * Log the underlying error for debugging without exposing it in the UI.
 */
export function logTechnicalError(context: string, error: unknown): void {
  // eslint-disable-next-line no-console -- intentional debug logging for support
  console.error(`[${context}]`, error)
}

interface UserFacingErrorOptions {
  /** Friendly message shown in the UI. */
  fallback: string
  /** Short label for console logging (e.g. "load-resources"). */
  context?: string
  /**
   * When true, allow short non-technical ApiError messages through.
   * Prefer false for generic load failures so copy stays consistent.
   */
  allowSafeApiMessage?: boolean
}

/**
 * Resolve a user-facing error string and log technical details.
 */
export function toUserFacingErrorMessage(
  error: unknown,
  { fallback, context = 'api', allowSafeApiMessage = false }: UserFacingErrorOptions,
): string {
  logTechnicalError(context, error)

  if (allowSafeApiMessage && error instanceof ApiError) {
    const message = error.message?.trim() ?? ''
    if (message && !looksLikeTechnicalErrorMessage(message)) {
      return message
    }
  }

  if (
    allowSafeApiMessage &&
    error instanceof Error &&
    !(error instanceof ApiError)
  ) {
    const message = error.message.trim()
    if (message && !looksLikeTechnicalErrorMessage(message)) {
      return message
    }
  }

  return fallback
}
