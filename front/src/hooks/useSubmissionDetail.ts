import { useAbortableQuery } from '@/hooks/useAbortableQuery'
import { fetchSubmissionById } from '@/services/staffSubmissionService'
import type { SubmissionDetailDto } from '@/types/moderationSubmission'

interface UseSubmissionDetailResult {
  submission: SubmissionDetailDto | null
  isLoading: boolean
  error: string | null
}

/**
 * Load a single submission for the staff review pane.
 */
export function useSubmissionDetail(
  submissionId: number | null,
): UseSubmissionDetailResult {
  const { data, isLoading, error } = useAbortableQuery(
    async (signal) => {
      if (submissionId == null) return null
      return fetchSubmissionById(submissionId, { signal })
    },
    {
      initialData: null,
      fallbackErrorMessage: 'Failed to load submission details',
      deps: [submissionId],
    },
  )

  return {
    submission: data,
    isLoading: submissionId != null ? isLoading : false,
    error: submissionId != null ? error : null,
  }
}
