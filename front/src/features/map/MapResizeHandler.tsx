import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { getMapBehaviour } from '@/features/map/config'

/** Recalculates map dimensions when the surrounding layout changes. */
export function MapResizeHandler({ layoutKey }: { layoutKey?: string }) {
  const map = useMap()
  const { resize } = getMapBehaviour()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize()
    }, resize.invalidateSizeDelayMs)

    return () => window.clearTimeout(timer)
  }, [map, layoutKey, resize.invalidateSizeDelayMs])

  return null
}
