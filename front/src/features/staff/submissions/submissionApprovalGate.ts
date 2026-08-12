/**
 * Shared approval-gate shape for staff submission review panels.
 */
export interface SubmissionApprovalGate {
  approveDisabled: boolean
  approveHelper?: string
}

/** @deprecated Temporary backend-pending copy; prefer product-specific helpers. */
export const EDITED_APPROVAL_BLOCKED_HELPER =
  'Edited approvals cannot be submitted until backend support for the finalized resource version is connected. Reject remains available, or reset your changes to approve the submission as proposed.'

export const INCOMPLETE_EDITED_APPROVAL_HELPER =
  'Fix validation errors in the highlighted fields before approving with your edits.'

/** Physical sites must finish MapTiler verification before Approve (public parity). */
export const UNVERIFIED_LOCATION_APPROVAL_HELPER =
  'Verify every physical address before approving. Fix the highlighted location details, then try again.'

export const SKILLS_EDITED_FOLLOW_UP_HELPER =
  'Skills submissions are accepted for follow-up as proposed. Reset your changes to continue, or reject the submission.'
