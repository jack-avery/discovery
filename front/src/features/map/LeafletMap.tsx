import { MapContainer as LeafletMapContainer, TileLayer } from 'react-leaflet'
import type { ResourceMapItem } from '@/types'
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, RRCRC_CENTER } from './constants'
import { MapResizeHandler } from './MapResizeHandler'
import { MarkerClusterGroup } from './MarkerClusterLayer'
import { ResourceMapMarkers } from './ResourceMapMarkers'

interface LeafletMapProps {
  items: ResourceMapItem[]
}

export function LeafletMap({ items }: LeafletMapProps) {
  return (
    <LeafletMapContainer
      center={RRCRC_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      className="absolute inset-0 z-0 h-full w-full"
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapResizeHandler />
      <MarkerClusterGroup>
        <ResourceMapMarkers items={items} />
      </MarkerClusterGroup>
    </LeafletMapContainer>
  )
}
