import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { useResourceSelection } from '@/features/discover/useResourceSelection'
import { getMapBehaviour } from '@/features/map/config'
import { fetchResourceById } from '@/services/resourceService'
import type { ResourceMapItem } from '@/types'

interface FlyToSelectedResourceProps {
  items: ResourceMapItem[]
}

/**
 * When Resource Detail opens (map, list, or any openResourceDetail caller),
 * smoothly centers the map on that resource at the current zoom.
 * Closing the workspace does not move the map.
 */
export function FlyToSelectedResource({ items }: FlyToSelectedResourceProps) {
  const map = useMap()
  const { selectedResourceId } = useResourceSelection()
  const { resize } = getMapBehaviour()
  /** Last resource we committed a flyTo for — blocks repeats after pin refresh. */
  const flownResourceIdRef = useRef<string | null>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    if (!selectedResourceId) {
      flownResourceIdRef.current = null
      return
    }

    if (flownResourceIdRef.current === selectedResourceId) {
      return
    }

    let cancelled = false
    const abort = new AbortController()

    // Wait until workspace open/resize invalidateSize has finished so the fly isn't interrupted.
    const timer = window.setTimeout(() => {
      void (async () => {
        const target = await resolveTargetLatLng(
          selectedResourceId,
          itemsRef.current,
          abort.signal,
        )
        if (cancelled || !target) return

        map.invalidateSize({ animate: false })

        // Preserve the user's zoom whether the marker is already in view or not.
        const zoom = map.getZoom()
        flownResourceIdRef.current = selectedResourceId
        map.flyTo(target, zoom, {
          animate: true,
          duration: 0.85,
          easeLinearity: 0.25,
        })
      })()
    }, resize.invalidateSizeDelayMs + 40)

    return () => {
      cancelled = true
      abort.abort()
      window.clearTimeout(timer)
    }
  }, [selectedResourceId, map, resize.invalidateSizeDelayMs, items])

  return null
}

async function resolveTargetLatLng(
  resourceId: string,
  items: ResourceMapItem[],
  signal: AbortSignal,
): Promise<[number, number] | null> {
  const pin = items.find((item) => item.id === resourceId)
  if (pin) {
    return [pin.location.latitude, pin.location.longitude]
  }

  try {
    const detail = await fetchResourceById(resourceId, { signal })
    const locations = detail.version.locations
    const location =
      locations.find((entry) => entry.is_primary && entry.lat != null && entry.lng != null) ??
      locations.find((entry) => entry.lat != null && entry.lng != null)

    if (location?.lat == null || location.lng == null) return null
    return [location.lat, location.lng]
  } catch {
    return null
  }
}
