/**
 * Shared helpers for Location card presentation (resources + events).
 */

import { meaningfulAccessModeLabel } from '@/features/staff/submissions/noteSectionUtils'

export { meaningfulAccessModeLabel }

/** Normalize a URL for href use. */
export function externalHref(url: string): string {
  const value = url.trim()
  if (!value) return value
  return value.startsWith('http') ? value : `https://${value}`
}

/**
 * Prefer the labelled online-access URL; fall back to a website contact value.
 */
export function resolveOnlineLocationUrl(
  onlineAccessUrl: string | null | undefined,
  websiteContactValue: string | null | undefined,
): string | null {
  const primary = onlineAccessUrl?.trim()
  if (primary) return primary
  const fallback = websiteContactValue?.trim()
  return fallback || null
}
