import { getMapConfig } from '@/features/map/config'
import type { BasemapConfig, BasemapConfigError, BasemapRequest, MapConfig } from '@/features/map/config'
import { getMapProvider } from '@/features/map/providers'
import {
  buildBasemapSelection,
  resolveBasemapRequest,
} from './resolveBasemapSelection'

const MAPTILER_MISSING_KEY_MESSAGE =
  'MapTiler is configured but VITE_MAPTILER_API_KEY is missing. Add it to your .env.local file.'

let hasLoggedBasemapMessage = false

function logBasemapMessageOnce(message: string): void {
  if (hasLoggedBasemapMessage) return
  console.warn(message)
  hasLoggedBasemapMessage = true
}

function buildConfigurationGuide(missingVariables: string[]): string {
  const lines = [
    '[Map Configuration] Incomplete environment configuration.',
    `Missing: ${missingVariables.join(', ')}`,
    '',
    'Required variables:',
    '  VITE_MAP_PROVIDER=maptiler          (or openstreetmap)',
    '  VITE_MAPTILER_API_KEY=<your-key>    (required when provider is maptiler)',
    '',
    'Optional:',
    '  VITE_MAP_STYLE=standard             (logical id: standard, satellite, terrain, outdoor)',
    '',
    'Development only:',
    '  VITE_MAP_DEV_FALLBACK=openstreetmap (explicit opt-in — never used in production)',
  ]
  return lines.join('\n')
}

function createError(
  code: BasemapConfigError['code'],
  message: string,
  userMessage: string,
  missingVariables: string[],
): BasemapConfigError {
  return {
    code,
    message,
    userMessage,
    missingVariables,
    developerDetails: import.meta.env.DEV ? buildConfigurationGuide(missingVariables) : undefined,
  }
}

function buildProviderContext(config: MapConfig, providerStyleId: string) {
  return {
    providerStyleId,
    secrets: config.secrets,
    viewport: config.viewport,
  }
}

function resolveDevFallback(
  config: MapConfig,
  reason: string,
  missingVariables: string[],
  styleInput: string,
): BasemapConfig | null {
  if (!import.meta.env.DEV) return null
  if (!config.devFallbackProvider) return null

  const fallbackProvider = getMapProvider(config.devFallbackProvider)
  if (!fallbackProvider) return null

  const selection = buildBasemapSelection(config.devFallbackProvider, styleInput)

  const warning = [
    '[Map Configuration] DEVELOPMENT FALLBACK ACTIVE.',
    `Reason: ${reason}`,
    `Using "${config.devFallbackProvider}" tiles instead of the configured provider.`,
    'This fallback is disabled in production. Fix your environment variables.',
    '',
    buildConfigurationGuide(missingVariables),
  ].join('\n')

  logBasemapMessageOnce(warning)

  return {
    providerId: config.devFallbackProvider,
    viewport: config.viewport,
    tileLayer: fallbackProvider.getTileLayerConfig(buildProviderContext(config, selection.providerStyleId)),
    error: null,
    devFallback: {
      active: true,
      fallbackProviderId: config.devFallbackProvider,
      intendedProviderId: config.providerId,
      reason,
      missingVariables,
    },
    selection,
  }
}

function resolveConfiguredProvider(
  config: MapConfig,
  providerId: NonNullable<MapConfig['providerId']>,
  styleInput: string,
): BasemapConfig {
  const provider = getMapProvider(providerId)!
  const selection = buildBasemapSelection(providerId, styleInput)
  const tileLayer = provider.getTileLayerConfig(
    buildProviderContext(config, selection.providerStyleId),
  )

  return {
    providerId,
    viewport: config.viewport,
    tileLayer,
    error: null,
    devFallback: null,
    selection,
  }
}

/**
 * Returns the active basemap configuration for the current environment.
 * Pass BasemapRequest to override provider/style at runtime (future theme picker).
 */
export function getBasemapConfig(request?: BasemapRequest): BasemapConfig {
  const config = getMapConfig()
  const { providerId, styleInput } = resolveBasemapRequest(config, request)

  if (!providerId) {
    const missingVariables = ['VITE_MAP_PROVIDER']
    const error = createError(
      'MISSING_CONFIG',
      buildConfigurationGuide(missingVariables),
      import.meta.env.DEV
        ? 'Map configuration is incomplete. Check the browser console for required environment variables.'
        : 'The map is temporarily unavailable. Please contact support if this persists.',
      missingVariables,
    )
    logBasemapMessageOnce(error.message)

    return (
      resolveDevFallback(config, 'VITE_MAP_PROVIDER is not set', missingVariables, styleInput) ?? {
        providerId: null,
        viewport: config.viewport,
        tileLayer: null,
        error,
        devFallback: null,
        selection: null,
      }
    )
  }

  const provider = getMapProvider(providerId)
  if (!provider) {
    const missingVariables = ['VITE_MAP_PROVIDER']
    const error = createError(
      'UNKNOWN_PROVIDER',
      `Unknown map provider "${providerId}". Set VITE_MAP_PROVIDER to a registered provider: maptiler, openstreetmap.`,
      'The map is temporarily unavailable. Please contact support if this persists.',
      missingVariables,
    )
    logBasemapMessageOnce(error.message)

    return {
      providerId,
      viewport: config.viewport,
      tileLayer: null,
      error,
      devFallback: null,
      selection: null,
    }
  }

  if (providerId === 'maptiler' && !config.secrets.mapTilerApiKey.trim()) {
    const missingVariables = ['VITE_MAPTILER_API_KEY']
    const error = createError(
      'MISSING_API_KEY',
      MAPTILER_MISSING_KEY_MESSAGE,
      import.meta.env.DEV
        ? 'Map tiles are unavailable. Add your MapTiler API key to .env.local.'
        : 'The map is temporarily unavailable. Please contact support if this persists.',
      missingVariables,
    )
    logBasemapMessageOnce(MAPTILER_MISSING_KEY_MESSAGE)

    return (
      resolveDevFallback(config, MAPTILER_MISSING_KEY_MESSAGE, missingVariables, styleInput) ??
      {
        providerId,
        viewport: config.viewport,
        tileLayer: null,
        error,
        devFallback: null,
        selection: null,
      }
    )
  }

  return resolveConfiguredProvider(config, providerId, styleInput)
}
