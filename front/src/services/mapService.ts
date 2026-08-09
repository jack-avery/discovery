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
 * Long-term map query. Geo fields adapt to lat/lng/radius_km.
 * Filter fields mirror list filters so Discover can share one query state.
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
  /** Empty / omitted = all categories. */
  categoryIds?: number[]
  /** Empty / omitted = all tags. */
  tagIds?: number[]
  search?: string
}

export type ResourceMapQueryLimitation =
  | {
      code: 'RADIUS_APPROXIMATES_VIEWPORT'
      detail: string
    }
  | { code: 'MULTI_TAG_UNSUPPORTED'; selectedIds: number[] }

export interface FetchMapResourcesOptions {
  signal?: AbortSignal
}

export interface ResourceMapResult {
  items: ResourceMapItem[]
  count: number
  limitations: ResourceMapQueryLimitation[]
}

export function mapPinToItem(pin: MapPinDto): ResourceMapItem {
  return {
    id: String(pin.resource_id),
    slug: pin.slug,
    name: pin.name,
    categoryName: pin.category_name,
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
 * Adapts {@link ResourceMapQuery} to GET /resources/map params.
 *
 * Required: `lat`, `lng`. Optional: `radius_km`, repeated `category_id` (OR),
 * single `tag_id` until multi-tag is wired, `search`.
 *
 * Category multi-select matches the list adapter (0 omit / 1+ send).
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

  const params: Record<string, QueryParamValue> = {
    lat: query.lat,
    lng: query.lng,
    radius_km: radiusKm,
  }

  const categoryIds = query.categoryIds?.filter((id) => Number.isFinite(id)) ?? []
  const tagIds = query.tagIds?.filter((id) => Number.isFinite(id)) ?? []

  if (categoryIds.length === 1) {
    params.category_id = categoryIds[0]
  } else if (categoryIds.length > 1) {
    params.category_id = categoryIds
  }

  if (tagIds.length === 1) {
    params.tag_id = tagIds[0]
  } else if (tagIds.length > 1) {
    limitations.push({
      code: 'MULTI_TAG_UNSUPPORTED',
      selectedIds: tagIds,
    })
  }

  const search = query.search?.trim()
  if (search) {
    params.search = search
  }

  return { params, limitations }
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
 * Quantize geo query values so sub-pixel pan noise does not re-fetch.
 * Filter fields are preserved as provided.
 */
export function stabilizeMapQuery(query: ResourceMapQuery): ResourceMapQuery {
  return {
    ...query,
    lat: Math.round(query.lat * 10000) / 10000,
    lng: Math.round(query.lng * 10000) / 10000,
    radiusKm:
      query.radiusKm === undefined
        ? undefined
        : Math.round(query.radiusKm * 10) / 10,
  }
}

/** Geo-only key — used when merging viewport updates without resetting filters. */
export function mapViewportQueryKey(query: ResourceMapQuery): string {
  const stable = stabilizeMapQuery(query)
  return JSON.stringify({
    lat: stable.lat,
    lng: stable.lng,
    radiusKm: stable.radiusKm ?? null,
  })
}

export function mapQueryKey(query: ResourceMapQuery): string {
  const stable = stabilizeMapQuery(query)
  return JSON.stringify({
    lat: stable.lat,
    lng: stable.lng,
    radiusKm: stable.radiusKm ?? null,
    categoryIds: query.categoryIds ?? [],
    tagIds: query.tagIds ?? [],
    search: query.search?.trim() ?? '',
  })
}

/**
 * Fetch map pins from GET /resources/map.
 * Builds params, calls the backend, maps DTOs — no client-side pin filtering.
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
