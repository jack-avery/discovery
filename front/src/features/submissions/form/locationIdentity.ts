import type { ExistingResourceLocation } from '@/types/submission'

/** Normalize location parts for duplicate comparison. */
export function normalizeLocationPart(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Identity key for a physical location within one contribution.
 * Includes street, unit, city, province, and postal code.
 */
export function locationIdentityKey(location: ExistingResourceLocation): string {
  return [
    normalizeLocationPart(location.streetAddress),
    normalizeLocationPart(location.unit),
    normalizeLocationPart(location.city),
    normalizeLocationPart(location.province),
    normalizeLocationPart(location.postalCode),
  ].join('|')
}

/**
 * True when two filled locations represent the same physical place.
 * Blank/incomplete rows are not treated as duplicates of each other.
 */
export function isDuplicateLocation(
  a: ExistingResourceLocation,
  b: ExistingResourceLocation,
): boolean {
  if (!a.streetAddress.trim() || !b.streetAddress.trim()) return false
  if (!a.city.trim() || !b.city.trim()) return false
  return locationIdentityKey(a) === locationIdentityKey(b)
}

export const DUPLICATE_LOCATION_MESSAGE = 'This location has already been added.'
