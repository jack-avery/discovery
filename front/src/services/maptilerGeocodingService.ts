import { getMapConfig } from '@/features/map/config'

export const ADDRESS_NOT_VERIFIED_MESSAGE =
  "We couldn't verify this address. Please check for spelling mistakes or enter a valid address."

export const ADDRESS_VERIFICATION_UNAVAILABLE_MESSAGE =
  "We couldn't verify this address right now. Please try again."

export type MapTilerGeocodeOutcome = 'valid' | 'not_found' | 'unavailable'

export interface PhysicalAddressQuery {
  streetAddress: string
  unit: string
  city: string
  province: string
  postalCode: string
}

/** Verified MapTiler feature center — GeoJSON order is [lng, lat]. */
export interface VerifiedCoordinates {
  lat: number
  lng: number
}

export type MapTilerGeocodeResult =
  | ({ outcome: 'valid' } & VerifiedCoordinates)
  | { outcome: 'not_found' }
  | { outcome: 'unavailable' }

interface MapTilerGeocodingFeature {
  place_name?: string
  relevance?: number
  place_type?: string[]
  /** [longitude, latitude] */
  center?: [number, number]
  geometry?: {
    type?: string
    coordinates?: number[]
  }
}

interface MapTilerGeocodingResponse {
  features?: MapTilerGeocodingFeature[]
}

/**
 * Forward-geocode a Canadian address via MapTiler.
 * Returns `unavailable` on network/API failures (submission must wait).
 * On `valid`, includes the matched feature's center coordinates.
 */
export async function verifyPhysicalAddressWithMapTiler(
  address: PhysicalAddressQuery,
  options?: { signal?: AbortSignal },
): Promise<MapTilerGeocodeResult> {
  const apiKey = getMapConfig().secrets.mapTilerApiKey.trim()
  if (!apiKey) {
    return { outcome: 'unavailable' }
  }

  const query = buildGeocodingQuery(address)
  const url = new URL(
    `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json`,
  )
  url.searchParams.set('key', apiKey)
  url.searchParams.set('country', 'ca')
  url.searchParams.set('limit', '5')
  url.searchParams.set('language', 'en')

  try {
    const response = await fetch(url.toString(), {
      signal: options?.signal,
    })

    if (!response.ok) {
      return { outcome: 'unavailable' }
    }

    const body = (await response.json()) as MapTilerGeocodingResponse
    const features = body.features ?? []
    if (features.length === 0) {
      return { outcome: 'not_found' }
    }

    const match = features
      .filter((feature) => (feature.relevance ?? 0) >= 0.4)
      .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))[0]

    if (!match) {
      return { outcome: 'not_found' }
    }

    const coords = extractFeatureCoordinates(match)
    if (!coords) {
      // Feature matched but had no usable center — treat as unavailable so
      // submission does not proceed without map coordinates.
      return { outcome: 'unavailable' }
    }

    return { outcome: 'valid', ...coords }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    return { outcome: 'unavailable' }
  }
}

function extractFeatureCoordinates(
  feature: MapTilerGeocodingFeature,
): VerifiedCoordinates | null {
  if (
    Array.isArray(feature.center) &&
    feature.center.length >= 2 &&
    Number.isFinite(feature.center[0]) &&
    Number.isFinite(feature.center[1])
  ) {
    return { lng: feature.center[0], lat: feature.center[1] }
  }

  const coordinates = feature.geometry?.coordinates
  if (
    feature.geometry?.type === 'Point' &&
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1])
  ) {
    return { lng: coordinates[0], lat: coordinates[1] }
  }

  return null
}

function buildGeocodingQuery(address: PhysicalAddressQuery): string {
  const street = address.streetAddress.trim()
  const unit = address.unit.trim()
  const city = address.city.trim()
  const province = address.province.trim()
  const postal = address.postalCode.trim()

  const streetLine = unit ? `${street}, ${unit}` : street
  return [streetLine, city, province, postal, 'Canada']
    .filter(Boolean)
    .join(', ')
}
