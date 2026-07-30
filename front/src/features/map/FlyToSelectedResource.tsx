import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import { useResourceSelection } from '@/features/discover/useResourceSelection'
import { useWorkspace } from '@/features/discover/providers/WorkspaceProvider'
import { getMapBehaviour } from '@/features/map/config'
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
 * When Resource Detail opens, bring the resource into the padded usable viewport
 * only if it is not already comfortably visible. Preserves zoom. Does not call
 * invalidateSize (MapResizeHandler owns that).
 */
export function FlyToSelectedResource({
  items,
  layoutKey,
  layoutReadyKey,
}: FlyToSelectedResourceProps) {
  const map = useMap()
  const { selectedResourceId } = useResourceSelection()
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

    // Layout changed (e.g. workspace expand): wait until MapResizeHandler signals
    // that invalidateSize has completed for this layoutKey.
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

      // Newest selection wins — stop any in-flight pan/fly before deciding.
      map.stop()

      // panInside no-ops when the point is already inside the padded view.
      map.panInside(target, {
        paddingTopLeft: [...padding.topLeft] as [number, number],
        paddingBottomRight: [...padding.bottomRight] as [number, number],
        animate: true,
        duration: selection.panDurationSec,
        easeLinearity: 0.25,
      })

      evaluatedResourceIdRef.current = selectedResourceId
    })()

    return () => {
      cancelled = true
      abort.abort()
      map.stop()
    }
  }, [
    selectedResourceId,
    map,
    layoutKey,
    layoutReadyKey,
    isExpanded,
    selection.paddingExpanded,
    selection.paddingCollapsed,
    selection.panDurationSec,
  ])

  return null
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
