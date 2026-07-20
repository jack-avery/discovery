import type { CreateSubmissionResponseDto } from '@/types/submissionApi'

/**
 * Post-submit outcome for the shared Update Resource workflow.
 *
 * Public and staff use the same form and the same submission path.
 * Outcome is decided by the backend response — never by client role checks.
 */
export type UpdateSubmissionOutcome = 'pending_review' | 'published'

/**
 * Map a successful POST /submissions response to the success UI variant.
 *
 * Today the API does not return moderation status, so every success is
 * treated as pending review.
 *
 * TODO(update-resource): When the backend auto-approves staff submissions and
 * returns moderation_status (or equivalent), branch here only — e.g.
 * `approved` → `published`. Do not infer outcome from the signed-in user's roles.
 */
export function resolveUpdateSubmissionOutcome(
  response: CreateSubmissionResponseDto,
): UpdateSubmissionOutcome {
  const status = response.moderation_status
  if (status === 'approved') return 'published'
  return 'pending_review'
}
