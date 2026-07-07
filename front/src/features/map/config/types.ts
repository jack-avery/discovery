import type { LatLngExpression } from 'leaflet'
import type { BasemapStyleId } from './basemapStyles'

/** Registered basemap provider identifiers. */
export type MapProviderId = 'maptiler' | 'openstreetmap'

export type { BasemapStyleId }

export interface MapViewportConfig {
  center: LatLngExpression
  defaultZoom: number
  minZoom: number
  maxZoom: number
}

/** Provider-agnostic TileLayer props consumed by Leaflet. */
export interface TileLayerConfig {
  url: string
  attribution: string
  maxZoom?: number
  minZoom?: number
}

export type BasemapConfigErrorCode =
  | 'MISSING_CONFIG'
  | 'MISSING_API_KEY'
  | 'UNKNOWN_PROVIDER'

export interface BasemapConfigError {
  code: BasemapConfigErrorCode
  /** Developer-facing message logged to the console. */
  message: string
  /** User-facing message shown in the map overlay. */
  userMessage: string
  /** Extra detail shown in development overlays. */
  developerDetails?: string
  missingVariables?: string[]
}

/** Active only in development when VITE_MAP_DEV_FALLBACK is explicitly set. */
export interface DevFallbackState {
  active: true
  fallbackProviderId: MapProviderId
  intendedProviderId: MapProviderId | null
  reason: string
  missingVariables: string[]
}

/** Resolved provider + style — the contract for runtime theme switching and provider changes. */
export interface BasemapSelection {
  providerId: MapProviderId
  /** Raw input — logical style id (e.g. "standard") or provider-native id (e.g. "basic-v2"). */
  styleInput: string
  /** Logical style id when the input matched the catalog; null for provider-native passthrough. */
  styleId: BasemapStyleId | null
  /** Provider-specific style string passed to the tile URL builder. */
  providerStyleId: string
}

/**
 * Optional runtime overrides for basemap resolution.
 * Deployment defaults come from environment variables via getMapConfig().
 */
export interface BasemapRequest {
  providerId?: MapProviderId
  styleId?: string
}

export interface BasemapConfig {
  providerId: MapProviderId | null
  viewport: MapViewportConfig
  tileLayer: TileLayerConfig | null
  error: BasemapConfigError | null
  devFallback: DevFallbackState | null
  /** Populated when tiles resolve successfully — records the active provider/style. */
  selection: BasemapSelection | null
}

/** Provider credentials collected from the environment — extend as new providers are added. */
export interface MapProviderSecrets {
  mapTilerApiKey: string
}

/** Resolved environment and defaults — single source of truth for map settings. */
export interface MapConfig {
  providerId: MapProviderId | null
  secrets: MapProviderSecrets
  /** Default style from VITE_MAP_STYLE — logical id or provider-native string. */
  defaultStyleInput: string
  viewport: MapViewportConfig
  /** Explicit development-only fallback provider (never used in production). */
  devFallbackProvider: MapProviderId | null
}

/** Context passed to providers — no provider-specific field names. */
export interface MapProviderContext {
  providerStyleId: string
  secrets: MapProviderSecrets
  viewport: MapViewportConfig
}

export interface MapProvider {
  readonly id: MapProviderId
  readonly supportedStyleIds: readonly BasemapStyleId[]
  getTileLayerConfig(context: MapProviderContext): TileLayerConfig
}
