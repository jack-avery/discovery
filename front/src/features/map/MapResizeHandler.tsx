import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { useSelection } from '@/app/providers/SelectionProvider'
import { getMapBehaviour } from '@/features/map/config'

/** Recalculates map dimensions when the detail panel opens or closes. */
export function MapResizeHandler() {
  const map = useMap()
  const { selectedResourceId } = useSelection()
  const { resize } = getMapBehaviour()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize()
    }, resize.invalidateSizeDelayMs)

    return () => window.clearTimeout(timer)
  }, [map, selectedResourceId, resize.invalidateSizeDelayMs])

  return null
}
