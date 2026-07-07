import type { MapConfig, MapProviderId } from './types'
import { DEFAULT_BASEMAP_STYLE_ID } from './basemapStyles'
import { MAP_BEHAVIOUR } from './mapBehaviour'

const VALID_PROVIDERS: MapProviderId[] = ['maptiler', 'openstreetmap']

function parseProviderId(raw: string | undefined): MapProviderId | null {
  if (!raw?.trim()) return null
  if (!VALID_PROVIDERS.includes(raw as MapProviderId)) return null
  return raw as MapProviderId
}

/**
 * Reads map configuration from environment variables and application defaults.
 * This module is the single source of truth for map provider, style, viewport, and API keys.
 */
export function getMapConfig(): MapConfig {
  const providerId = parseProviderId(import.meta.env.VITE_MAP_PROVIDER)

  return {
    providerId,
    secrets: {
      mapTilerApiKey: import.meta.env.VITE_MAPTILER_API_KEY ?? '',
    },
    defaultStyleInput: import.meta.env.VITE_MAP_STYLE || DEFAULT_BASEMAP_STYLE_ID,
    viewport: MAP_BEHAVIOUR.viewport,
    devFallbackProvider: parseDevFallbackProvider(import.meta.env.VITE_MAP_DEV_FALLBACK),
  }
}

function parseDevFallbackProvider(raw: string | undefined): MapProviderId | null {
  if (!raw?.trim()) return null
  if (!VALID_PROVIDERS.includes(raw as MapProviderId)) return null
  return raw as MapProviderId
}
