import { TOUR_TARGETS, type TourTargetId } from './tourTargets'

export interface DiscoverTourStep {
  id: string
  targetId: TourTargetId
  /** Optional fallbacks if the primary target is missing. */
  fallbackTargetIds?: TourTargetId[]
  heading: string
  body: string
}

/**
 * Canonical Discover guided-tour steps (exact product copy).
 */
export const DISCOVER_TOUR_STEPS: readonly DiscoverTourStep[] = [
  {
    id: 'search',
    targetId: TOUR_TARGETS.search,
    heading: 'Search for resources',
    body: "Search by name or keyword to find resources that match what you're looking for.",
  },
  {
    id: 'filters',
    targetId: TOUR_TARGETS.filters,
    heading: 'Narrow your results',
    body: 'Choose categories and filters to focus on the resources that are most useful to you.',
  },
  {
    id: 'results',
    targetId: TOUR_TARGETS.results,
    heading: 'Browse the results',
    body: 'Select a resource from the list to open it and view more information.',
  },
  {
    id: 'details',
    targetId: TOUR_TARGETS.resourceDetail,
    heading: 'View resource details',
    body: "Here you'll find useful information like hours, contact details, location, and more.",
  },
  {
    id: 'explore-map',
    targetId: TOUR_TARGETS.map,
    heading: 'Explore the map',
    body: "You can also open a resource from the map. Select any pin to see what's there.",
  },
  {
    id: 'map-details',
    targetId: TOUR_TARGETS.resourceDetail,
    heading: 'View the resource',
    body: 'Selecting a map pin opens the resource here, where you can view its details.',
  },
  {
    id: 'update-resource',
    targetId: TOUR_TARGETS.updateResource,
    heading: 'Keep information up to date',
    body: "Spot something that's changed? Use Update Resource to send corrected information for staff to review.",
  },
  {
    id: 'contribute',
    targetId: TOUR_TARGETS.contribute,
    heading: 'Share what you know',
    body: "Know about a resource that isn't on the map? Contribute it so others in the community can find it too.",
  },
] as const

export const DISCOVER_TOUR_STEP_COUNT = DISCOVER_TOUR_STEPS.length

export function isLastTourStep(index: number): boolean {
  return index >= DISCOVER_TOUR_STEP_COUNT - 1
}

export function isFirstTourStep(index: number): boolean {
  return index <= 0
}

export function getTourStepIndexById(stepId: string): number {
  return DISCOVER_TOUR_STEPS.findIndex((step) => step.id === stepId)
}

/** Steps that explain an already-open Resource Detail (top of panel). */
export function isResourceDetailIntroStep(stepId: string): boolean {
  return stepId === 'details' || stepId === 'map-details'
}
