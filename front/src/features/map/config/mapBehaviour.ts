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
    /**
     * Shared stroke for MarkerCluster spider legs and detail-zoom overlap fans.
     * Target: ~2.5–3px, dark grey, high opacity, solid round caps/joins.
     */
    spiderLegPolylineOptions: {
      weight: 2.75,
      color: '#222222',
      opacity: 0.8,
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
    },
  },
  /**
   * Detail-zoom overlap rendering (OPTION B).
   * Non-separable coordinates use a display-only fan — not MarkerCluster spiderfy.
   */
  overlap: {
    /** At this zoom and above, non-separable groups use the fan layout. */
    detailZoom: 16,
    /**
     * Max projected pixel distance at map maxZoom for treating two pins as
     * the same location. Distinct nearby places must remain separate.
     */
    maxPixelDistance: 1,
    /** Pixel radius of the display-only fan around the shared geographic anchor. */
    fanRadiusPx: 28,
    /** Legs from the true geographic anchor to each fan marker. */
    showSpiderLegs: true,
  },
  resize: {
    /** Delay before invalidating map size — slightly after the workspace transition completes. */
    invalidateSizeDelayMs: 320,
  },
  /**
   * Selection camera: origin-aware (map click vs resource panel).
   * Left padding approximates the Discover workspace when expanded (`w-80` / `md:w-[23rem]`).
   */
  selection: {
    /** Standard resource-focus zoom when the current zoom is below this level. */
    focusZoom: 16,
    /** Short animation duration (seconds) for selection camera moves. */
    panDurationSec: 0.3,
    paddingExpanded: {
      topLeft: [352, 56] as const,
      bottomRight: [48, 48] as const,
    },
    paddingCollapsed: {
      topLeft: [56, 56] as const,
      bottomRight: [48, 48] as const,
    },
    /**
     * Mobile Discover (bottom sheet): left clears zoom controls; bottom inset
     * is derived from sheet height when resource detail is open (see
     * `resolveSelectionPadding`); this fraction is the browse fallback.
     */
    paddingMobile: {
      topLeft: [56, 72] as const,
      bottomRightX: 24,
      /** Mid-sheet fallback when detail sheet is not open. */
      bottomInsetFraction: 0.55,
    },
  },
} as const

export type MapBehaviourConfig = typeof MAP_BEHAVIOUR

export function getMapBehaviour(): MapBehaviourConfig {
  return MAP_BEHAVIOUR
}
