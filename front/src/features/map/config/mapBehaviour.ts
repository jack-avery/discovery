import type { LatLngExpression } from 'leaflet'

/** Rideau-Rockcliffe Community Resource Centre — 815 St. Laurent Blvd, Ottawa */
const RRCRC_CENTER: LatLngExpression = [45.4445, -75.6392]

/**
 * Application defaults for map behaviour — viewport, clustering, and resize timing.
 * Provider-agnostic settings live here; basemap provider settings live in mapConfig.ts.
 */
export const MAP_BEHAVIOUR = {
  viewport: {
    center: RRCRC_CENTER,
    defaultZoom: 13,
    minZoom: 11,
    maxZoom: 18,
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
} as const

export type MapBehaviourConfig = typeof MAP_BEHAVIOUR

export function getMapBehaviour(): MapBehaviourConfig {
  return MAP_BEHAVIOUR
}
