import type { ExistingResourceLocation } from '@/types/submission'
import {
  INVALID_CANADIAN_POSTAL_MESSAGE,
  isValidCanadianPostalCode,
} from '@/utils/canadianPostalCode'
import { getLocationHeading } from '../existingResource/emptyState'

export interface LocationFieldErrors {
  streetAddress?: string
  city?: string
  province?: string
  postalCode?: string
}

export function isLocationAddressComplete(
  location: ExistingResourceLocation,
): boolean {
  return (
    Boolean(location.streetAddress.trim()) &&
    Boolean(location.city.trim()) &&
    Boolean(location.province.trim()) &&
    Boolean(location.postalCode.trim()) &&
    isValidCanadianPostalCode(location.postalCode)
  )
}

/** Stable cache key for geocoding — excludes optional location name. */
export function locationGeocodingCacheKey(
  location: ExistingResourceLocation,
): string {
  return [
    location.streetAddress.trim().toLowerCase(),
    location.unit.trim().toLowerCase(),
    location.city.trim().toLowerCase(),
    location.province.trim().toLowerCase(),
    location.postalCode.trim().toUpperCase().replace(/\s+/g, ''),
  ].join('|')
}

export function validateLocationFields(
  location: ExistingResourceLocation,
  index: number,
): LocationFieldErrors {
  const label = getLocationHeading(location, index)
  const errors: LocationFieldErrors = {}

  if (!location.streetAddress.trim()) {
    errors.streetAddress = `${label}: Street address is required.`
  }
  if (!location.city.trim()) {
    errors.city = `${label}: City is required.`
  }
  if (!location.province.trim()) {
    errors.province = `${label}: Province is required.`
  }
  if (!location.postalCode.trim()) {
    errors.postalCode = `${label}: Postal code is required.`
  } else if (!isValidCanadianPostalCode(location.postalCode)) {
    errors.postalCode = `${label}: ${INVALID_CANADIAN_POSTAL_MESSAGE}`
  }

  return errors
}
