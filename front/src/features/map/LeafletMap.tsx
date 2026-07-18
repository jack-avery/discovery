import { MapContainer as LeafletMapContainer } from 'react-leaflet'
import type { ResourceMapItem } from '@/types'
import type { ResourceMapQuery } from '@/services/mapService'
import { BasemapDevFallbackBanner } from '@/features/map/components/BasemapDevFallbackBanner'
import { BasemapErrorOverlay } from '@/features/map/components/BasemapErrorOverlay'
import { BasemapTileLayer } from '@/features/map/components/BasemapTileLayer'
import { getBasemapConfig } from '@/features/map/services'
import { FlyToSelectedResource } from './FlyToSelectedResource'
import { MapResizeHandler } from './MapResizeHandler'
import { MapViewportReporter } from './MapViewportReporter'
import { MarkerClusterGroup } from './MarkerClusterLayer'
import { ResourceMapMarkers } from './ResourceMapMarkers'

interface LeafletMapProps {
  items: ResourceMapItem[]
  layoutKey?: string
  onViewportQueryChange?: (query: ResourceMapQuery) => void
}

export function LeafletMap({ items, layoutKey, onViewportQueryChange }: LeafletMapProps) {
  const basemap = getBasemapConfig()
  const { viewport, tileLayer, error, devFallback } = basemap

  return (
    <>
      <LeafletMapContainer
        center={viewport.center}
        zoom={viewport.defaultZoom}
        minZoom={viewport.minZoom}
        maxZoom={viewport.maxZoom}
        className="absolute inset-0 z-0 h-full w-full"
        zoomControl
      >
        {tileLayer && <BasemapTileLayer config={tileLayer} />}
        <MapResizeHandler layoutKey={layoutKey} />
        {onViewportQueryChange && (
          <MapViewportReporter onQueryChange={onViewportQueryChange} />
        )}
        <FlyToSelectedResource items={items} />
        <MarkerClusterGroup>
          <ResourceMapMarkers items={items} />
        </MarkerClusterGroup>
      </LeafletMapContainer>

      {devFallback && <BasemapDevFallbackBanner devFallback={devFallback} />}
      {error && <BasemapErrorOverlay error={error} />}
    </>
  )
}
