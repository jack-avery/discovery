import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { useSelection } from '@/app/providers/SelectionProvider'

/** Recalculates map dimensions when the detail panel opens or closes. */
export function MapResizeHandler() {
  const map = useMap()
  const { selectedResourceId } = useSelection()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize()
    }, 320)

    return () => window.clearTimeout(timer)
  }, [map, selectedResourceId])

  return null
}
