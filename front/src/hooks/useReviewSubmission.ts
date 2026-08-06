import { useCallback, useState } from 'react'
import {
  reviewSubmission,
} from '@/services/staffSubmissionService'
import type {
  ReviewDecision,
  ReviewSubmissionResultDto,
} from '@/types/moderationSubmission'
import { toUserFacingErrorMessage } from '@/utils/userFacingError'

interface UseReviewSubmissionResult {
  isSubmitting: boolean
  error: string | null
  lastResult: ReviewSubmissionResultDto | null
  clearError: () => void
  clearResult: () => void
  submitDecision: (
    submissionId: number,
    decision: ReviewDecision,
    notes?: string,
  ) => Promise<ReviewSubmissionResultDto | null>
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
      notes?: string,
    ): Promise<ReviewSubmissionResultDto | null> => {
      setIsSubmitting(true)
      setError(null)

      try {
        const result = await reviewSubmission(submissionId, {
          decision,
          ...(notes?.trim() ? { notes: notes.trim() } : {}),
        })
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
