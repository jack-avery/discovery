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

interface MapTilerGeocodingFeature {
  place_name?: string
  relevance?: number
  place_type?: string[]
}

interface MapTilerGeocodingResponse {
  features?: MapTilerGeocodingFeature[]
}

/**
 * Forward-geocode a Canadian address via MapTiler.
 * Returns `unavailable` on network/API failures (submission must wait).
 */
export async function verifyPhysicalAddressWithMapTiler(
  address: PhysicalAddressQuery,
  options?: { signal?: AbortSignal },
): Promise<MapTilerGeocodeOutcome> {
  const apiKey = getMapConfig().secrets.mapTilerApiKey.trim()
  if (!apiKey) {
    return 'unavailable'
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
      return 'unavailable'
    }

    const body = (await response.json()) as MapTilerGeocodingResponse
    const features = body.features ?? []
    if (features.length === 0) {
      return 'not_found'
    }

    const hasReasonableMatch = features.some((feature) => {
      const relevance = feature.relevance ?? 0
      return relevance >= 0.4
    })

    return hasReasonableMatch ? 'valid' : 'not_found'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    return 'unavailable'
  }
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
