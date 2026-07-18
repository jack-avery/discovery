import type { MapProvider, MapProviderContext, TileLayerConfig } from '@/features/map/config'
import { getStylesForProvider } from '@/features/map/config'

export const openStreetMapProvider: MapProvider = {
  id: 'openstreetmap',
  supportedStyleIds: getStylesForProvider('openstreetmap'),

  getTileLayerConfig(_context: MapProviderContext): TileLayerConfig {
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }
  },
}
