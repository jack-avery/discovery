import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { LatLngExpression } from 'leaflet'
import { useMap } from 'react-leaflet'
import { useResourceSelection } from '@/features/discover/useResourceSelection'
import { useWorkspace } from '@/features/discover/providers/WorkspaceProvider'
import { getMapBehaviour } from '@/features/map/config'
import {
  getPaddedViewCenter,
  resolveFocusZoom,
} from '@/features/map/selectionCamera'
import { fetchResourceById } from '@/services/resourceService'
import type { ResourceMapItem } from '@/types'

interface FlyToSelectedResourceProps {
  items: ResourceMapItem[]
  /** Current workspace layout key (may differ from layoutReadyKey during resize). */
  layoutKey?: string
  /**
   * Layout key for which MapResizeHandler has completed invalidateSize.
   * Movement runs only when this matches layoutKey (or when they already match).
   */
  layoutReadyKey?: string
}

/**
 * Origin-aware selection camera (single owner of automatic map movement).
 *
 * - Map marker click: zoom to focusZoom around the pin only when below it;
 *   never pan/recenter when already at/above focusZoom.
 * - Panel / programmatic: always center in the padded usable map area; zoom up
 *   to focusZoom when below it; preserve closer zooms.
 *
 * Does not manage overlap presentation (ResourceMarkersLayer owns clustering vs
 * detail-zoom fan layout). Does not call invalidateSize (MapResizeHandler owns that).
 */
export function FlyToSelectedResource({
  items,
  layoutKey,
  layoutReadyKey,
}: FlyToSelectedResourceProps) {
  const map = useMap()
  const { selectedResourceId, lastResourceOpenOrigin } = useResourceSelection()
  const { isExpanded } = useWorkspace()
  const { selection } = getMapBehaviour()

  /** Last resource we finished evaluating for movement — blocks repeats while still selected. */
  const evaluatedResourceIdRef = useRef<string | null>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    if (!selectedResourceId) {
      evaluatedResourceIdRef.current = null
      return
    }

    if (evaluatedResourceIdRef.current === selectedResourceId) {
      return
    }

    const origin = lastResourceOpenOrigin
    const focusZoom = selection.focusZoom
    const isMapOrigin = origin === 'map' || origin == null
    const isPanelOrigin = origin === 'results' || origin === 'programmatic'

    if (isMapOrigin && map.getZoom() >= focusZoom) {
      evaluatedResourceIdRef.current = selectedResourceId
      return
    }

    if (layoutKey !== layoutReadyKey) {
      return
    }

    let cancelled = false
    const abort = new AbortController()

    const padding = isExpanded
      ? selection.paddingExpanded
      : selection.paddingCollapsed

    void (async () => {
      const target = await resolveTargetLatLng(
        selectedResourceId,
        itemsRef.current,
        abort.signal,
      )
      if (cancelled || !target) return

      map.stop()

      if (isMapOrigin) {
        map.setZoomAround(L.latLng(target), focusZoom, { animate: true })
        evaluatedResourceIdRef.current = selectedResourceId
        return
      }

      if (isPanelOrigin) {
        focusResourceFromPanel({
          map,
          target,
          focusZoom,
          paddingTopLeft: padding.topLeft,
          paddingBottomRight: padding.bottomRight,
          durationSec: selection.panDurationSec,
        })
        evaluatedResourceIdRef.current = selectedResourceId
      }
    })()

    return () => {
      cancelled = true
      abort.abort()
      map.stop()
    }
  }, [
    selectedResourceId,
    lastResourceOpenOrigin,
    map,
    layoutKey,
    layoutReadyKey,
    isExpanded,
    selection.focusZoom,
    selection.paddingExpanded,
    selection.paddingCollapsed,
    selection.panDurationSec,
  ])

  return null
}

interface PanelFocusArgs {
  map: L.Map
  target: LatLngExpression
  focusZoom: number
  paddingTopLeft: readonly [number, number]
  paddingBottomRight: readonly [number, number]
  durationSec: number
}

function focusResourceFromPanel(args: PanelFocusArgs): void {
  const {
    map,
    target,
    focusZoom,
    paddingTopLeft,
    paddingBottomRight,
    durationSec,
  } = args

  const zoom = resolveFocusZoom(map.getZoom(), focusZoom)
  const center = getPaddedViewCenter(
    map,
    target,
    zoom,
    paddingTopLeft,
    paddingBottomRight,
  )

  if (isCameraAlreadyAt(map, center, zoom)) {
    return
  }

  map.flyTo(center, zoom, {
    animate: true,
    duration: durationSec,
    easeLinearity: 0.25,
  })
}

function isCameraAlreadyAt(
  map: L.Map,
  center: L.LatLng,
  zoom: number,
): boolean {
  if (Math.abs(map.getZoom() - zoom) > 1e-6) return false
  const current = map.getCenter()
  const px = map.project(current, zoom)
  const targetPx = map.project(center, zoom)
  return px.distanceTo(targetPx) < 1
}

async function resolveTargetLatLng(
  resourceId: string,
  items: ResourceMapItem[],
  signal: AbortSignal,
): Promise<LatLngExpression | null> {
  const pin = items.find((item) => item.id === resourceId)
  if (pin) {
    return [pin.location.latitude, pin.location.longitude]
  }

  try {
    const detail = await fetchResourceById(resourceId, { signal })
    const locations = detail.version.locations
    const location =
      locations.find(
        (entry) => entry.is_primary && entry.lat != null && entry.lng != null,
      ) ?? locations.find((entry) => entry.lat != null && entry.lng != null)

    if (location?.lat == null || location.lng == null) return null
    return [location.lat, location.lng]
  } catch {
    return null
  }
}
