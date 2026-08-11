import type { LatLngExpression } from 'leaflet'
import { DEPLOYMENT_CONFIG } from '@/config/deploymentConfig'

/**
 * Application defaults for map behaviour — viewport, clustering, and resize timing.
 * Provider-agnostic settings live here; basemap provider settings live in mapConfig.ts.
 * Geographic centre/zoom come from DEPLOYMENT_CONFIG (not branding).
 */
export const MAP_BEHAVIOUR = {
  viewport: {
    center: [
      DEPLOYMENT_CONFIG.geography.defaultMapCenter[0],
      DEPLOYMENT_CONFIG.geography.defaultMapCenter[1],
    ] as LatLngExpression,
    defaultZoom: DEPLOYMENT_CONFIG.geography.defaultMapZoom,
    minZoom: 11,
    maxZoom: 18,
    /**
     * Initial / fallback radius (km) for GET /resources/map before Leaflet
     * reports bounds. Matches the backend default.
     */
    defaultRadiusKm: 10,
    /** Debounce pan/zoom before re-querying map pins. */
    queryDebounceMs: 350,
  },
  cluster: {
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
  },
  resize: {
    /** Delay before invalidating map size — slightly after the workspace transition completes. */
    invalidateSizeDelayMs: 320,
  },
  /**
   * Selection movement: pan only when the target is outside this padded usable view.
   * Left padding approximates the Discover workspace when expanded (`w-80` / `md:w-[23rem]`).
   */
  selection: {
    /** Short pan duration (seconds) when movement is required — replaces long flyTo. */
    panDurationSec: 0.3,
    paddingExpanded: {
      topLeft: [352, 56] as const,
      bottomRight: [48, 48] as const,
    },
    paddingCollapsed: {
      topLeft: [56, 56] as const,
      bottomRight: [48, 48] as const,
    },
  },
} as const

export type MapBehaviourConfig = typeof MAP_BEHAVIOUR

export function getMapBehaviour(): MapBehaviourConfig {
  return MAP_BEHAVIOUR
}
