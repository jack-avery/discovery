import { useState } from 'react'
import { MapContainer as LeafletMapContainer, ZoomControl } from 'react-leaflet'
import type { ResourceMapItem } from '@/types'
import type { ResourceMapQuery } from '@/services/mapService'
import { BasemapDevFallbackBanner } from '@/features/map/components/BasemapDevFallbackBanner'
import { BasemapErrorOverlay } from '@/features/map/components/BasemapErrorOverlay'
import { BasemapTileLayer } from '@/features/map/components/BasemapTileLayer'
import { getBasemapConfig } from '@/features/map/services'
import { useIsMobile } from '@/hooks/useIsMobile'
import { FlyToSelectedResource } from './FlyToSelectedResource'
import { MapResizeHandler } from './MapResizeHandler'
import { MapViewportReporter } from './MapViewportReporter'
import { ResourceMarkersLayer } from './ResourceMarkersLayer'

interface LeafletMapProps {
  items: ResourceMapItem[]
  layoutKey?: string
  onViewportQueryChange?: (query: ResourceMapQuery) => void
}

export function LeafletMap({ items, layoutKey, onViewportQueryChange }: LeafletMapProps) {
  const isMobile = useIsMobile()
  const basemap = getBasemapConfig()
  const { viewport, tileLayer, error, devFallback } = basemap

  /**
   * Tracks which layoutKey MapResizeHandler has finished invalidateSize for.
   * Initialized to the current layoutKey so selections with no layout change
   * evaluate immediately; becomes stale when layoutKey changes until onLayoutReady.
   */
  const [layoutReadyKey, setLayoutReadyKey] = useState(layoutKey)

  return (
    <>
      <LeafletMapContainer
        center={viewport.center}
        zoom={viewport.defaultZoom}
        minZoom={viewport.minZoom}
        maxZoom={viewport.maxZoom}
        className="absolute inset-0 z-0 h-full w-full"
        // Mobile: hide +/-; pinch zoom + touch pan keep Leaflet defaults.
        zoomControl={false}
      >
        {!isMobile ? <ZoomControl position="topleft" /> : null}
        {tileLayer && <BasemapTileLayer config={tileLayer} />}
        <MapResizeHandler layoutKey={layoutKey} onLayoutReady={setLayoutReadyKey} />
        {onViewportQueryChange && (
          <MapViewportReporter onQueryChange={onViewportQueryChange} />
        )}
        <FlyToSelectedResource
          items={items}
          layoutKey={layoutKey}
          layoutReadyKey={layoutReadyKey}
        />
        <ResourceMarkersLayer items={items} />
      </LeafletMapContainer>

      {devFallback && <BasemapDevFallbackBanner devFallback={devFallback} />}
      {error && <BasemapErrorOverlay error={error} />}
    </>
  )
}
