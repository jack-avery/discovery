import type { LatLngExpression, Map as LeafletMap } from 'leaflet'
import type { ResourceMapItem } from '@/types'

export interface OverlapGroup {
  /** Stable key from projected pixel at map maxZoom. */
  key: string
  /** True geographic anchor (first member's coordinates; all are effectively identical). */
  anchor: { latitude: number; longitude: number }
  /** Members sorted by resource id ascending. */
  members: ResourceMapItem[]
}

export interface PartitionOverlapResult {
  /** Resources that are alone at their coordinate (or all items when not expanding). */
  singletons: ResourceMapItem[]
  /** Groups with 2+ effectively identical coordinates. */
  overlapGroups: OverlapGroup[]
}

export interface OverlapPartitionOptions {
  /** Zoom used for projection when testing separability (typically map maxZoom). */
  projectZoom: number
  /** Max projected pixel distance to treat two points as the same location. */
  maxPixelDistance: number
}

export interface ProjectedPoint {
  x: number
  y: number
}

/**
 * Web Mercator pixel projection (Leaflet EPSG:3857–compatible tile pixels).
 * Pure math — no DOM/Leaflet runtime required.
 */
export function projectLatLngToPoint(
  latitude: number,
  longitude: number,
  projectZoom: number,
): ProjectedPoint {
  const scale = 256 * 2 ** projectZoom
  const x = ((longitude + 180) / 360) * scale
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, latitude))
  const sin = Math.sin((clampedLat * Math.PI) / 180)
  const y =
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale
  return { x, y }
}

function overlapKey(point: ProjectedPoint, maxPixelDistance: number): string {
  const cell = Math.max(1, maxPixelDistance)
  const x = Math.round(point.x / cell) * cell
  const y = Math.round(point.y / cell) * cell
  return `${x}:${y}`
}

/**
 * Partition resources into singletons vs non-separable overlap groups.
 *
 * Grouping uses projected pixel identity at `projectZoom` (typically maxZoom),
 * not address text. Members within each group are sorted by resource id.
 */
export function partitionOverlapGroups(
  items: ResourceMapItem[],
  options: OverlapPartitionOptions,
): PartitionOverlapResult {
  const { projectZoom, maxPixelDistance } = options
  const buckets = new Map<string, ResourceMapItem[]>()

  for (const item of items) {
    const point = projectLatLngToPoint(
      item.location.latitude,
      item.location.longitude,
      projectZoom,
    )
    const key = overlapKey(point, maxPixelDistance)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.push(item)
    } else {
      buckets.set(key, [item])
    }
  }

  const singletons: ResourceMapItem[] = []
  const overlapGroups: OverlapGroup[] = []

  for (const [key, members] of buckets) {
    const sorted = [...members].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    )
    if (sorted.length < 2) {
      singletons.push(...sorted)
      continue
    }
    overlapGroups.push({
      key,
      anchor: {
        latitude: sorted[0].location.latitude,
        longitude: sorted[0].location.longitude,
      },
      members: sorted,
    })
  }

  singletons.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  overlapGroups.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))

  return { singletons, overlapGroups }
}

export interface FanPixelOffset {
  x: number
  y: number
}

/**
 * Deterministic pixel offsets for an overlap fan, ordered to match
 * id-sorted members. Selection must not affect these offsets.
 *
 * - 2: angled left/right
 * - 3+: even radial distribution starting from the top (-90°)
 */
export function fanPixelOffsets(
  count: number,
  radiusPx: number,
): FanPixelOffset[] {
  if (count <= 0) return []
  if (count === 1) return [{ x: 0, y: 0 }]
  if (count === 2) {
    return [
      { x: -radiusPx, y: -radiusPx * 0.25 },
      { x: radiusPx, y: -radiusPx * 0.25 },
    ]
  }

  const startAngle = -Math.PI / 2
  return Array.from({ length: count }, (_, index) => {
    const angle = startAngle + (2 * Math.PI * index) / count
    return {
      x: Math.cos(angle) * radiusPx,
      y: Math.sin(angle) * radiusPx,
    }
  })
}

interface MapProjection {
  latLngToLayerPoint: LeafletMap['latLngToLayerPoint']
  layerPointToLatLng: LeafletMap['layerPointToLatLng']
}

/**
 * Convert a pixel offset from an anchor into a display LatLng at the current
 * map zoom/centre. Geographic resource data is not modified — callers only use
 * this for Marker `position`.
 */
export function offsetAnchorToLatLng(
  map: MapProjection,
  anchor: { latitude: number; longitude: number },
  offset: FanPixelOffset,
): LatLngExpression {
  const origin = map.latLngToLayerPoint([anchor.latitude, anchor.longitude])
  const latLng = map.layerPointToLatLng(origin.add([offset.x, offset.y]))
  return [latLng.lat, latLng.lng]
}
