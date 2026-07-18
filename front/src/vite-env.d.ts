/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_MAP_PROVIDER?: string
  readonly VITE_MAPTILER_API_KEY?: string
  readonly VITE_MAP_STYLE?: string
  /** Development only — explicit opt-in fallback provider (e.g. openstreetmap). Never used in production. */
  readonly VITE_MAP_DEV_FALLBACK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
