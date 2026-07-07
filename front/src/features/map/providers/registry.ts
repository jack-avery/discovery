import type { MapProvider, MapProviderId } from '@/features/map/config'
import { mapTilerProvider } from './maptiler'
import { openStreetMapProvider } from './openstreetmap'

const providerRegistry = new Map<MapProviderId, MapProvider>([
  [openStreetMapProvider.id, openStreetMapProvider],
  [mapTilerProvider.id, mapTilerProvider],
])

export function getMapProvider(id: MapProviderId): MapProvider | undefined {
  return providerRegistry.get(id)
}

/** Register an additional basemap provider without modifying LeafletMap. */
export function registerMapProvider(provider: MapProvider): void {
  providerRegistry.set(provider.id, provider)
}

export function getRegisteredProviderIds(): MapProviderId[] {
  return [...providerRegistry.keys()]
}
