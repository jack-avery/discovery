import L from 'leaflet'
import type { LatLngExpression, Map as LeafletMap } from 'leaflet'

/**
 * Geographic map center that places `target` at the visual center of the
 * usable (padded) map area — accounting for the Discover workspace panel.
 */
export function getPaddedViewCenter(
  map: LeafletMap,
  target: LatLngExpression,
  zoom: number,
  paddingTopLeft: readonly [number, number],
  paddingBottomRight: readonly [number, number],
): L.LatLng {
  const latlng = L.latLng(target)
  const offset = L.point(
    (paddingTopLeft[0] - paddingBottomRight[0]) / 2,
    (paddingTopLeft[1] - paddingBottomRight[1]) / 2,
  )
  return map.unproject(map.project(latlng, zoom).subtract(offset), zoom)
}

/** Zoom used for resource focus: at least `focusZoom`, never zoom out. */
export function resolveFocusZoom(currentZoom: number, focusZoom: number): number {
  return Math.max(currentZoom, focusZoom)
}
