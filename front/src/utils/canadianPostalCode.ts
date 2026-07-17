/** Canadian postal code: A1A 1A1 (space optional in input). */
const CA_POSTAL_RE = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/

export const INVALID_CANADIAN_POSTAL_MESSAGE =
  'Enter a valid Canadian postal code (e.g. K2G 1V8).'

export function isValidCanadianPostalCode(value: string): boolean {
  return CA_POSTAL_RE.test(value.trim())
}

/** Normalize to `A1A 1A1` uppercase, or null when invalid/empty. */
export function normalizeCanadianPostalCode(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!CA_POSTAL_RE.test(trimmed)) return null

  const compact = trimmed.replace(/\s+/g, '').toUpperCase()
  return `${compact.slice(0, 3)} ${compact.slice(3)}`
}
