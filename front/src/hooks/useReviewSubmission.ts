import { useCallback, useState } from 'react'
import {
  reviewSubmission,
} from '@/services/staffSubmissionService'
import type {
  ApprovedResourceVersionPayload,
  ReviewDecision,
  ReviewSubmissionRequestDto,
  ReviewSubmissionResultDto,
} from '@/types/moderationSubmission'
import { toUserFacingErrorMessage } from '@/utils/userFacingError'

/** Optional fields for {@link UseReviewSubmissionResult.submitDecision}. */
export interface SubmitReviewDecisionOptions {
  notes?: string
  approvedVersion?: ApprovedResourceVersionPayload
}

interface UseReviewSubmissionResult {
  isSubmitting: boolean
  error: string | null
  lastResult: ReviewSubmissionResultDto | null
  clearError: () => void
  clearResult: () => void
  /**
   * Submit a review decision.
   *
   * Third argument may be a notes string (legacy) or an options object.
   * Pass `approvedVersion` only when publishing a reviewer-edited snapshot.
   */
  submitDecision: (
    submissionId: number,
    decision: ReviewDecision,
    notesOrOptions?: string | SubmitReviewDecisionOptions,
  ) => Promise<ReviewSubmissionResultDto | null>
}

function normalizeSubmitOptions(
  notesOrOptions?: string | SubmitReviewDecisionOptions,
): SubmitReviewDecisionOptions {
  if (notesOrOptions == null) return {}
  if (typeof notesOrOptions === 'string') return { notes: notesOrOptions }
  return notesOrOptions
}

function buildReviewRequest(
  decision: ReviewDecision,
  options: SubmitReviewDecisionOptions,
): ReviewSubmissionRequestDto {
  const payload: ReviewSubmissionRequestDto = { decision }
  const notes = options.notes?.trim()
  if (notes) {
    payload.notes = notes
  }
  if (options.approvedVersion) {
    payload.approved_version = options.approvedVersion
  }
  return payload
}

/**
 * Approve / reject / accept-for-follow-up mutation for a selected submission.
 */
export function useReviewSubmission(): UseReviewSubmissionResult {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ReviewSubmissionResultDto | null>(
    null,
  )

  const clearError = useCallback(() => setError(null), [])
  const clearResult = useCallback(() => setLastResult(null), [])

  const submitDecision = useCallback(
    async (
      submissionId: number,
      decision: ReviewDecision,
      notesOrOptions?: string | SubmitReviewDecisionOptions,
    ): Promise<ReviewSubmissionResultDto | null> => {
      setIsSubmitting(true)
      setError(null)

      try {
        const result = await reviewSubmission(
          submissionId,
          buildReviewRequest(decision, normalizeSubmitOptions(notesOrOptions)),
        )
        setLastResult(result)
        return result
      } catch (err) {
        setError(
          toUserFacingErrorMessage(err, {
            fallback:
              "We couldn't complete this review decision. Please try again.",
            context: 'review-submission',
          }),
        )
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [],
  )

  return {
    isSubmitting,
    error,
    lastResult,
    clearError,
    clearResult,
    submitDecision,
  }
}
