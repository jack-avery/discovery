import { useCallback, useEffect, useState } from 'react'
import { useAbortableQuery } from '@/hooks/useAbortableQuery'
import {
  fetchReviewQueue,
  type ReviewContributionFilter,
  type ReviewQueueItem,
  type ReviewQueueSort,
} from '@/features/staff/submissions/fetchReviewQueue'

interface UseSubmissionQueueResult {
  items: ReviewQueueItem[]
  isLoading: boolean
  error: string | null
  reload: () => void
  /** Optimistically remove a reviewed item before the reload settles. */
  removeItem: (submissionId: number) => void
}

/**
 * Pending submission queue for staff review (filter + sort aware).
 */
export function useSubmissionQueue(
  filter: ReviewContributionFilter,
  sort: ReviewQueueSort,
): UseSubmissionQueueResult {
  const [reloadKey, setReloadKey] = useState(0)
  const [optimisticRemovedIds, setOptimisticRemovedIds] = useState<number[]>([])

  const { data, isLoading, error } = useAbortableQuery(
    (signal) => fetchReviewQueue({ filter, sort, signal }),
    {
      initialData: [],
      fallbackErrorMessage: 'Failed to load submission queue',
      deps: [reloadKey, filter, sort],
    },
  )

  // Drop optimistic removals once the server payload no longer includes them.
  useEffect(() => {
    setOptimisticRemovedIds((ids) =>
      ids.filter((id) => data.some((item) => item.submission_id === id)),
    )
  }, [data])

  // Changing filter/sort should not keep stale optimistic removals.
  useEffect(() => {
    setOptimisticRemovedIds([])
  }, [filter, sort])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  const removeItem = useCallback((submissionId: number) => {
    setOptimisticRemovedIds((ids) =>
      ids.includes(submissionId) ? ids : [...ids, submissionId],
    )
  }, [])

  const items = data.filter(
    (item) => !optimisticRemovedIds.includes(item.submission_id),
  )

  return {
    items,
    isLoading,
    error,
    reload,
    removeItem,
  }
}
