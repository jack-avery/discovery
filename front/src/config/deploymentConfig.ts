/**
 * Deployment geography and locale defaults for this frontend install.
 *
 * Branding (community name / mark / app name) lives in `appBranding.ts`.
 * These values are intentionally separate so another community can set map
 * centre and address defaults without editing application components or
 * mixing geography into branding config.
 */
export const DEPLOYMENT_CONFIG = {
  geography: {
    /** Default Discover map centre [lat, lng]. */
    defaultMapCenter: [45.4445, -75.6392] as const,
    defaultMapZoom: 13,
    /** Prefill / blank-check defaults for physical location forms. */
    defaultCity: 'Ottawa',
    defaultProvince: 'Ontario',
  },
} as const

export type DeploymentConfig = typeof DEPLOYMENT_CONFIG
