/**
 * Small browser cookie helpers for auth CSRF (readable cookies only).
 * Do not use for HttpOnly cookies — those are inaccessible to JavaScript.
 */

/**
 * Read a single cookie by name from `document.cookie`.
 * Returns `null` when unavailable, missing, or `document` is not present.
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined' || !name) {
    return null
  }

  const source = document.cookie
  if (!source) {
    return null
  }

  const encodedName = encodeURIComponent(name)
  const parts = source.split(';')

  for (const part of parts) {
    const segment = part.trim()
    if (!segment) continue

    const eq = segment.indexOf('=')
    if (eq < 0) continue

    const key = segment.slice(0, eq).trim()
    if (key !== name && key !== encodedName) continue

    const rawValue = segment.slice(eq + 1).trim()
    try {
      return decodeURIComponent(rawValue)
    } catch {
      return rawValue
    }
  }

  return null
}
