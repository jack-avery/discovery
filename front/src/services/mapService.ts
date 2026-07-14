import { api, type QueryParamValue } from '@/services/api'
import type { MapPinDto, MapPinsDto, ResourceMapItem } from '@/types/resource-map'

/**
 * Defaults aligned with MAP_BEHAVIOUR.viewport (mapBehaviour.ts).
 * Kept here so the service layer does not import UI/feature modules.
 */
const MAP_QUERY_DEFAULTS = {
  lat: 45.4445,
  lng: -75.6392,
  radiusKm: 10,
} as const

/**
 * Long-term map query. Today adapts to lat/lng/radius_km.
 * FUTURE bbox support should land only in {@link buildMapQueryParams}.
 */
export interface ResourceMapQuery {
  lat: number
  lng: number
  /** Search radius in kilometres (backend max 50). */
  radiusKm?: number
  /**
   * Reserved for future viewport/bbox APIs.
   * Ignored by today's backend adapter.
   */
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
}

export type ResourceMapQueryLimitation = {
  code: 'RADIUS_APPROXIMATES_VIEWPORT'
  detail: string
}

export interface FetchMapResourcesOptions {
  signal?: AbortSignal
}

export interface ResourceMapResult {
  items: ResourceMapItem[]
  count: number
  limitations: ResourceMapQueryLimitation[]
}

/**
 * Soft slug from a display name — used only as a fallback icon key.
 * Backend map pins expose `category_name`, not `slug`.
 */
function softSlugify(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function mapPinToItem(pin: MapPinDto): ResourceMapItem {
  return {
    id: String(pin.resource_id),
    slug: pin.slug,
    name: pin.name,
    categorySlug: softSlugify(pin.category_name),
    categoryName: pin.category_name,
    colorHex: pin.color_hex,
    iconIdentifier: pin.icon_identifier,
    resourceType: pin.resource_type,
    isVirtual: pin.is_virtual,
    location: {
      latitude: pin.lat,
      longitude: pin.lng,
    },
    distanceMeters: Math.round(pin.distance_km * 1000),
  }
}

/**
 * Adapts {@link ResourceMapQuery} to today's GET /resources/map params.
 *
 * Backend today: required `lat`, `lng`; optional `radius_km` (default 10, max 50).
 *
 * FUTURE bounding-box (change only this function):
 * When backend accepts north/south/east/west (or bbox), send `query.bounds`
 * and stop synthesizing radius from the viewport.
 */
export function buildMapQueryParams(query: ResourceMapQuery): {
  params: Record<string, QueryParamValue>
  limitations: ResourceMapQueryLimitation[]
} {
  const limitations: ResourceMapQueryLimitation[] = []

  if (query.bounds) {
    limitations.push({
      code: 'RADIUS_APPROXIMATES_VIEWPORT',
      detail:
        'Backend accepts lat/lng/radius_km only. Bounds were provided for a future API and are not sent; a covering radius is used instead.',
    })
  }

  const radiusKm = Math.min(
    50,
    Math.max(1, query.radiusKm ?? MAP_QUERY_DEFAULTS.radiusKm),
  )

  return {
    params: {
      lat: query.lat,
      lng: query.lng,
      radius_km: radiusKm,
    },
    limitations,
  }
}

/** Initial map query from configured Discover map centre (before Leaflet reports bounds). */
export function getDefaultMapQuery(): ResourceMapQuery {
  return {
    lat: MAP_QUERY_DEFAULTS.lat,
    lng: MAP_QUERY_DEFAULTS.lng,
    radiusKm: MAP_QUERY_DEFAULTS.radiusKm,
  }
}

/**
 * Great-circle distance in km (same formula family as backend Haversine).
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Derive a radius query that covers the visible rectangular viewport.
 * Uses centre → NE corner distance (circumradius of the bbox) clamped to [1, 50] km.
 *
 * Limitation: a circle cannot match a rectangular viewport exactly — pins near
 * corner gaps of a smaller inscribed circle are included; extra pins may appear
 * slightly outside the visible rectangle on the short sides.
 */
export function viewportToMapQuery(input: {
  lat: number
  lng: number
  north: number
  south: number
  east: number
  west: number
}): ResourceMapQuery {
  const radiusKm = haversineKm(input.lat, input.lng, input.north, input.east)

  return {
    lat: input.lat,
    lng: input.lng,
    radiusKm: Math.min(50, Math.max(1, radiusKm)),
    bounds: {
      north: input.north,
      south: input.south,
      east: input.east,
      west: input.west,
    },
  }
}

/**
 * Quantize query values so sub-pixel pan noise does not re-fetch.
 */
export function stabilizeMapQuery(query: ResourceMapQuery): ResourceMapQuery {
  return {
    lat: Math.round(query.lat * 10000) / 10000,
    lng: Math.round(query.lng * 10000) / 10000,
    radiusKm:
      query.radiusKm === undefined
        ? undefined
        : Math.round(query.radiusKm * 10) / 10,
    bounds: query.bounds,
  }
}

export function mapQueryKey(query: ResourceMapQuery): string {
  const stable = stabilizeMapQuery(query)
  return JSON.stringify({
    lat: stable.lat,
    lng: stable.lng,
    radiusKm: stable.radiusKm ?? null,
  })
}

/**
 * Fetch map pins from GET /resources/map.
 */
export async function fetchMapResources(
  query: ResourceMapQuery = getDefaultMapQuery(),
  options: FetchMapResourcesOptions = {},
): Promise<ResourceMapResult> {
  const { params, limitations } = buildMapQueryParams(query)

  const data = await api.get<MapPinsDto>('/resources/map', {
    params,
    signal: options.signal,
  })

  const pins = data?.pins ?? []

  return {
    items: pins.map(mapPinToItem),
    count: data?.count ?? pins.length,
    limitations,
  }
}
