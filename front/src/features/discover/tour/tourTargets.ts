/**
 * Stable `data-tour` attribute values for Discover guided tour anchors.
 * Do not use CSS classes, DOM indices, or Leaflet internals as targets.
 */
export const TOUR_TARGETS = {
  search: 'search',
  filters: 'filters',
  results: 'results',
  contribute: 'contribute',
  /** Discover / resource workspace panel — coachmark docking anchor. */
  workspace: 'workspace',
  /** Map canvas — spotlighted during the explore-map step for pin selection. */
  map: 'map',
  /** Resource detail overlay — Step 4 target after a result is opened. */
  resourceDetail: 'resource-detail',
  /** Update Resource action inside resource detail. */
  updateResource: 'update-resource',
} as const

export type TourTargetId = (typeof TOUR_TARGETS)[keyof typeof TOUR_TARGETS]

export const TOUR_TARGET_ATTR = 'data-tour'

export function tourTargetSelector(targetId: TourTargetId | string): string {
  return `[${TOUR_TARGET_ATTR}="${targetId}"]`
}

/** Skip targets inside inactive workspace layers (aria-hidden) or with no box. */
export function isTourTargetUsable(element: HTMLElement): boolean {
  if (element.closest('[aria-hidden="true"]')) return false
  const style = typeof window !== 'undefined' ? window.getComputedStyle(element) : null
  if (style && (style.visibility === 'hidden' || style.display === 'none')) {
    return false
  }
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

export function findTourTarget(
  targetId: TourTargetId | string,
): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const matches = document.querySelectorAll<HTMLElement>(
    tourTargetSelector(targetId),
  )
  for (const element of matches) {
    if (isTourTargetUsable(element)) return element
  }
  return null
}

/**
 * Step 4 targets live Resource Detail only when a real resource is selected.
 * Never prefers a stale empty detail overlay over nothing.
 */
export function resolveDetailsStepTarget(args: {
  isResourceDetailActive: boolean
  selectedResourceId: string | null | undefined
  findTarget?: typeof findTourTarget
}): HTMLElement | null {
  const find = args.findTarget ?? findTourTarget

  if (args.isResourceDetailActive && args.selectedResourceId) {
    return find(TOUR_TARGETS.resourceDetail)
  }

  return null
}
