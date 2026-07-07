import type { BasemapRequest, BasemapSelection, MapConfig, MapProviderId } from '@/features/map/config'
import { resolveProviderStyleId } from '@/features/map/config'

export interface ResolvedBasemapRequest {
  providerId: MapProviderId | null
  styleInput: string
}

/** Merges deployment defaults with optional runtime overrides (future theme picker, etc.). */
export function resolveBasemapRequest(
  config: MapConfig,
  request?: BasemapRequest,
): ResolvedBasemapRequest {
  return {
    providerId: request?.providerId ?? config.providerId,
    styleInput: request?.styleId ?? config.defaultStyleInput,
  }
}

export function buildBasemapSelection(
  providerId: MapProviderId,
  styleInput: string,
): BasemapSelection {
  const { styleId, providerStyleId } = resolveProviderStyleId(providerId, styleInput)

  return {
    providerId,
    styleInput,
    styleId,
    providerStyleId,
  }
}
