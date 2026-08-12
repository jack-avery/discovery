/**
 * Application-shell branding for the reusable Resource Map frontend.
 *
 * These values are intentionally centralized so another community can customize
 * community name, mark, and application name without editing NavigationRail or
 * other shell components. Landing-page / RRCRC-organization marketing copy is
 * separate and may remain deployment-specific.
 */
export const APP_BRANDING = {
  /** Community served by this deployment (nav title, staff portal identity). */
  communityName: 'Rideau-Rockcliffe',
  /** Short mark shown in the navigation logo badge. */
  communityMark: 'RR',
  /** Product / application subtitle in the shell. */
  applicationName: 'Resource Map',
} as const

/** Browser tab title derived from shell branding. */
export function appDocumentTitle(): string {
  return `${APP_BRANDING.communityName} ${APP_BRANDING.applicationName}`
}
