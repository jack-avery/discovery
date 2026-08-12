/**
 * Lightweight session flag so chrome outside DiscoverTourProvider
 * (e.g. NavigationRail) can respect an active Discover tour.
 */
let discoverTourSessionActive = false

/** Accessible label for the coachmark close (X) control — sole early-exit affordance. */
export const TOUR_CLOSE_LABEL = 'Close guided tour'

export function setDiscoverTourSessionActive(active: boolean): void {
  discoverTourSessionActive = active
  if (typeof document !== 'undefined') {
    if (active) {
      document.documentElement.dataset.discoverTourActive = 'true'
    } else {
      delete document.documentElement.dataset.discoverTourActive
    }
  }
}

export function isDiscoverTourSessionActive(): boolean {
  return discoverTourSessionActive
}
