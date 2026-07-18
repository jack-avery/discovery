import { TileLayer } from 'react-leaflet'
import type { TileLayerConfig } from '@/features/map/config'

interface BasemapTileLayerProps {
  config: TileLayerConfig
}

/** Renders the active basemap tiles without any provider-specific knowledge. */
export function BasemapTileLayer({ config }: BasemapTileLayerProps) {
  return (
    <TileLayer
      url={config.url}
      attribution={config.attribution}
      minZoom={config.minZoom}
      maxZoom={config.maxZoom}
    />
  )
}
