/**
 * Live submit eligibility + footer copy for the Update Resource workspace.
 * Derived from current form state — never latched from a prior submit attempt.
 *
 * Submit stays enabled whenever there is a meaningful change so the user can
 * attempt submission and reveal validation. Completeness is enforced on click.
 */

export const UPDATE_SUBMIT_FIX_RESOURCE_MESSAGE =
  'Fix the highlighted resource fields before submitting.'

export const UPDATE_SUBMIT_NO_CHANGES_MESSAGE =
  'Make at least one change before submitting.'

export const UPDATE_SUBMIT_CONTRIBUTOR_MESSAGE =
  'Complete your contact information before submitting.'

export interface UpdateSubmitGateInput {
  hasChanges: boolean
  resourceComplete: boolean
  contributorComplete: boolean
  /**
   * True after Submit has been attempted and resource field errors may be shown
   * (`showResourceErrors`).
   */
  resourceValidationRevealed: boolean
  /**
   * True after Submit has been attempted and contributor field errors may be shown
   * (`showContributorErrors`).
   */
  contributorValidationRevealed: boolean
}

export interface UpdateSubmitGate {
  /**
   * Whether the Submit control is enabled. Based on meaningful changes only —
   * incomplete data can still be submitted to trigger validation UX.
   */
  canSubmit: boolean
  /** Blocking footer message, or null when there is no form-blocking copy. */
  footerMessage: string | null
}

/**
 * Priority for footer (when hasChanges):
 * 1. Resource validation revealed + currently incomplete → fix resource fields
 * 2. Contributor validation revealed + currently incomplete → contributor message
 * 3. Otherwise → no blocking message (Submit may still proceed or re-validate)
 *
 * When !hasChanges → "Make at least one change..." and Submit disabled.
 */
export function deriveUpdateSubmitGate(
  input: UpdateSubmitGateInput,
): UpdateSubmitGate {
  if (!input.hasChanges) {
    return {
      canSubmit: false,
      footerMessage: UPDATE_SUBMIT_NO_CHANGES_MESSAGE,
    }
  }

  if (input.resourceValidationRevealed && !input.resourceComplete) {
    return {
      canSubmit: true,
      footerMessage: UPDATE_SUBMIT_FIX_RESOURCE_MESSAGE,
    }
  }

  if (input.contributorValidationRevealed && !input.contributorComplete) {
    return {
      canSubmit: true,
      footerMessage: UPDATE_SUBMIT_CONTRIBUTOR_MESSAGE,
    }
  }

  return { canSubmit: true, footerMessage: null }
}
