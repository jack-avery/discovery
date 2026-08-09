import type { ExistingResourceLocation } from '@/types/submission'

/**
 * Canonical location snapshot for semantic equality (form dirty detection,
 * moderation structured edits, Current→Proposed `changed`, etc.).
 *
 * Text fields are trimmed; UI-only `id` is ignored; lat/lng are included
 * because coordinates affect map/publish state. Order is normalized via
 * stable sort on content (comparison only — does not reorder stored data).
 */
export type CanonicalLocation = {
  locationName: string
  streetAddress: string
  unit: string
  city: string
  province: string
  postalCode: string
  lat: number | null
  lng: number | null
}

function normalizeCoordinate(value: number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

export function canonicalizeLocations(
  locations: ExistingResourceLocation[],
): CanonicalLocation[] {
  return locations
    .map((location) => ({
      locationName: location.locationName.trim(),
      streetAddress: location.streetAddress.trim(),
      unit: location.unit.trim(),
      city: location.city.trim(),
      province: location.province.trim(),
      postalCode: location.postalCode.trim(),
      lat: normalizeCoordinate(location.lat),
      lng: normalizeCoordinate(location.lng),
    }))
    .sort((a, b) => locationSortKey(a).localeCompare(locationSortKey(b)))
}

function locationSortKey(location: CanonicalLocation): string {
  return [
    location.locationName,
    location.streetAddress,
    location.unit,
    location.city,
    location.province,
    location.postalCode,
    location.lat === null ? '' : String(location.lat),
    location.lng === null ? '' : String(location.lng),
  ].join('\u0001')
}

/** True when two location lists are semantically equivalent. */
export function areLocationsEquivalent(
  a: ExistingResourceLocation[],
  b: ExistingResourceLocation[],
): boolean {
  return (
    JSON.stringify(canonicalizeLocations(a)) ===
    JSON.stringify(canonicalizeLocations(b))
  )
}
