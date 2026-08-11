import type { ResourceOpenOrigin } from '@/features/discover/providers/WorkspaceNavigationProvider'

/**
 * Pure helpers for interactive-tour auto-advance.
 * Advance only on a successful resource open from the demonstrated surface.
 *
 * Exactly two auto-advances exist:
 * - results → details
 * - explore-map → map-details
 *
 * Never auto-advance into update-resource.
 */

export function shouldAutoAdvanceFromResults(args: {
  stepId: string
  origin: ResourceOpenOrigin | null | undefined
  selectedResourceId: string | null | undefined
}): boolean {
  return (
    args.stepId === 'results' &&
    Boolean(args.selectedResourceId) &&
    args.origin === 'results'
  )
}

export function shouldAutoAdvanceFromMap(args: {
  stepId: string
  origin: ResourceOpenOrigin | null | undefined
  selectedResourceId: string | null | undefined
}): boolean {
  return (
    args.stepId === 'explore-map' &&
    Boolean(args.selectedResourceId) &&
    args.origin === 'map'
  )
}

/** Step id reached after a successful map pin open. */
export const MAP_SELECTION_AUTO_ADVANCE_STEP_ID = 'map-details' as const

/** Step id reached after a successful results-list open. */
export const RESULTS_SELECTION_AUTO_ADVANCE_STEP_ID = 'details' as const

/** Steps that wait for a demonstrated interaction before preferring Next. */
export function isInteractionDemoStep(stepId: string): boolean {
  return stepId === 'results' || stepId === 'explore-map'
}

/**
 * Guard key so the same selection cannot advance the tour twice.
 */
export function tourAutoAdvanceGuardKey(args: {
  stepId: string
  resourceId: string
  origin: ResourceOpenOrigin
}): string {
  return `${args.stepId}:${args.origin}:${args.resourceId}`
}
