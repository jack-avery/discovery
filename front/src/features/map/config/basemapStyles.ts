import type { MapProviderId } from './types'

/** Application-level basemap style identifiers — independent of any tile provider. */
export type BasemapStyleId = 'standard' | 'satellite' | 'terrain' | 'outdoor'

export interface BasemapStyleDefinition {
  id: BasemapStyleId
  /** Provider-native style identifiers keyed by registered provider. */
  providerStyles: Partial<Record<MapProviderId, string>>
}

/**
 * Catalog of logical basemap styles.
 * UI theme pickers and dark-mode variants should reference these ids, not provider strings.
 */
export const BASEMAP_STYLES: Record<BasemapStyleId, BasemapStyleDefinition> = {
  standard: {
    id: 'standard',
    providerStyles: { maptiler: 'basic-v2', openstreetmap: 'default' },
  },
  satellite: {
    id: 'satellite',
    providerStyles: { maptiler: 'satellite-v2' },
  },
  terrain: {
    id: 'terrain',
    providerStyles: { maptiler: 'topo-v2' },
  },
  outdoor: {
    id: 'outdoor',
    providerStyles: { maptiler: 'outdoor-v2' },
  },
}

export const DEFAULT_BASEMAP_STYLE_ID: BasemapStyleId = 'standard'

const BASEMAP_STYLE_IDS = new Set<string>(Object.keys(BASEMAP_STYLES))

export function isBasemapStyleId(value: string): value is BasemapStyleId {
  return BASEMAP_STYLE_IDS.has(value)
}

/** Returns logical style ids supported by the given provider. */
export function getStylesForProvider(providerId: MapProviderId): BasemapStyleId[] {
  return (Object.values(BASEMAP_STYLES) as BasemapStyleDefinition[])
    .filter((style) => style.providerStyles[providerId] !== undefined)
    .map((style) => style.id)
}

/**
 * Resolves a logical style id or provider-native style string to a provider-specific style id.
 * Provider-native strings (e.g. "basic-v2") pass through for MapTiler to preserve env compatibility.
 */
export function resolveProviderStyleId(
  providerId: MapProviderId,
  styleInput: string,
): { styleId: BasemapStyleId | null; providerStyleId: string } {
  if (isBasemapStyleId(styleInput)) {
    const providerStyleId = BASEMAP_STYLES[styleInput].providerStyles[providerId]
    if (providerStyleId) {
      return { styleId: styleInput, providerStyleId }
    }
  }

  if (providerId === 'maptiler') {
    return { styleId: null, providerStyleId: styleInput }
  }

  return { styleId: 'standard', providerStyleId: 'default' }
}
