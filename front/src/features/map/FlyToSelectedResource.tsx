import { useEffect, useRef, useContext } from 'react'
import L from 'leaflet'
import type { LatLngExpression } from 'leaflet'
import { useMap } from 'react-leaflet'
import { useResourceSelection } from '@/features/discover/useResourceSelection'
import { WorkspaceNavigationContext } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { useWorkspace } from '@/features/discover/providers/WorkspaceProvider'
import { getMapBehaviour } from '@/features/map/config'
import {
  getPaddedViewCenter,
  resolveFocusZoom,
} from '@/features/map/selectionCamera'
import { resolveSelectionPadding } from '@/features/map/selectionPadding'
import { useIsMobile } from '@/hooks/useIsMobile'
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
 *   never pan/recenter when already at/above focusZoom (desktop only).
 * - Mobile map marker: same zoom rules, but pan into the visible map strip
 *   above the resource-detail bottom sheet when the sheet would obscure the pin.
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
  const isMobile = useIsMobile()
  const { selectedResourceId, lastResourceOpenOrigin } = useResourceSelection()
  const workspaceNav = useContext(WorkspaceNavigationContext)
  const { isExpanded } = useWorkspace()
  const { selection } = getMapBehaviour()

  const showingMobileResourceDetail =
    isMobile && workspaceNav?.current.id === 'resource-detail'

  /** Blocks repeat moves for the same resource + mobile sheet obstruction state. */
  const evaluatedCameraKeyRef = useRef<string | null>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    if (!selectedResourceId) {
      evaluatedCameraKeyRef.current = null
      return
    }

    const cameraKey = `${selectedResourceId}:${showingMobileResourceDetail ? 'detail' : 'browse'}`
    if (evaluatedCameraKeyRef.current === cameraKey) {
      return
    }

    const origin = lastResourceOpenOrigin
    const focusZoom = selection.focusZoom
    const isMapOrigin = origin === 'map' || origin == null
    const isPanelOrigin = origin === 'results' || origin === 'programmatic'

    if (!isMobile && isMapOrigin && map.getZoom() >= focusZoom) {
      evaluatedCameraKeyRef.current = cameraKey
      return
    }

    if (layoutKey !== layoutReadyKey) {
      return
    }

    let cancelled = false
    const abort = new AbortController()

    const padding = resolveSelectionPadding({
      isMobile,
      isExpanded,
      mapHeightPx: map.getSize().y,
      selection,
      showingResourceDetail: showingMobileResourceDetail,
    })

    void (async () => {
      const target = await resolveTargetLatLng(
        selectedResourceId,
        itemsRef.current,
        abort.signal,
      )
      if (cancelled || !target) return

      map.stop()

      if (isMapOrigin && !isMobile) {
        map.setZoomAround(L.latLng(target), focusZoom, { animate: true })
        evaluatedCameraKeyRef.current = cameraKey
        return
      }

      if (isMapOrigin && isMobile) {
        focusResourceFromPanel({
          map,
          target,
          focusZoom,
          paddingTopLeft: padding.topLeft,
          paddingBottomRight: padding.bottomRight,
          durationSec: selection.panDurationSec,
        })
        evaluatedCameraKeyRef.current = cameraKey
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
        evaluatedCameraKeyRef.current = cameraKey
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
    showingMobileResourceDetail,
    map,
    layoutKey,
    layoutReadyKey,
    isExpanded,
    isMobile,
    selection,
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
