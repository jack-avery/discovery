import type { MapProvider, MapProviderContext, TileLayerConfig } from '@/features/map/config'
import { getStylesForProvider } from '@/features/map/config'

export const mapTilerProvider: MapProvider = {
  id: 'maptiler',
  supportedStyleIds: getStylesForProvider('maptiler'),

  getTileLayerConfig(context: MapProviderContext): TileLayerConfig {
    const { providerStyleId, secrets, viewport } = context

    return {
      url: `https://api.maptiler.com/maps/${providerStyleId}/256/{z}/{x}/{y}.png?key=${secrets.mapTilerApiKey}`,
      attribution:
        '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      minZoom: viewport.minZoom,
      maxZoom: viewport.maxZoom,
    }
  },
}
