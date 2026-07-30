import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { getMapBehaviour } from '@/features/map/config'

interface MapResizeHandlerProps {
  layoutKey?: string
  /**
   * Called after invalidateSize for the given layoutKey.
   * MapResizeHandler is the sole owner of invalidateSize.
   */
  onLayoutReady?: (layoutKey: string | undefined) => void
}

/** Recalculates map dimensions when the surrounding layout changes.
 * Sole owner of map.invalidateSize for the Discover/Leaflet map.
 */
export function MapResizeHandler({
  layoutKey,
  onLayoutReady,
}: MapResizeHandlerProps) {
  const map = useMap()
  const { resize } = getMapBehaviour()

  useEffect(() => {
    const readyKey = layoutKey
    const timer = window.setTimeout(() => {
      map.invalidateSize({ animate: false })
      onLayoutReady?.(readyKey)
    }, resize.invalidateSizeDelayMs)

    return () => window.clearTimeout(timer)
  }, [map, layoutKey, onLayoutReady, resize.invalidateSizeDelayMs])

  return null
}
