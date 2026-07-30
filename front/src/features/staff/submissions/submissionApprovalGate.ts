/**
 * Shared approval-gate shape for staff submission review panels.
 * Used while finalized-version backend support is pending.
 */
export interface SubmissionApprovalGate {
  approveDisabled: boolean
  approveHelper?: string
}

export const EDITED_APPROVAL_BLOCKED_HELPER =
  'Edited approvals cannot be submitted until backend support for the finalized resource version is connected. Reject remains available, or reset your changes to approve the submission as proposed.'
