import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { getMapBehaviour } from '@/features/map/config'
import {
  stabilizeMapQuery,
  viewportToMapQuery,
  type ResourceMapQuery,
} from '@/services/mapService'

interface MapViewportReporterProps {
  onQueryChange: (query: ResourceMapQuery) => void
}

/**
 * Reports a lat/lng/radius_km query derived from the live Leaflet viewport.
 * Debounced via MAP_BEHAVIOUR.viewport.queryDebounceMs to limit re-fetches.
 */
export function MapViewportReporter({ onQueryChange }: MapViewportReporterProps) {
  const map = useMap()
  const { viewport } = getMapBehaviour()
  const onQueryChangeRef = useRef(onQueryChange)
  onQueryChangeRef.current = onQueryChange

  useEffect(() => {
    let timer: number | undefined

    const publish = () => {
      const center = map.getCenter()
      const bounds = map.getBounds()
      const next = stabilizeMapQuery(
        viewportToMapQuery({
          lat: center.lat,
          lng: center.lng,
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        }),
      )
      onQueryChangeRef.current(next)
    }

    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(publish, viewport.queryDebounceMs)
    }

    publish()
    map.on('moveend', schedule)
    map.on('zoomend', schedule)

    return () => {
      window.clearTimeout(timer)
      map.off('moveend', schedule)
      map.off('zoomend', schedule)
    }
  }, [map, viewport.queryDebounceMs])

  return null
}
