import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAbortableQuery } from '@/hooks/useAbortableQuery'
import {
  fetchReviewQueue,
  type ReviewContributionKind,
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
 * Pending submission queue for staff review (multi filter + sort aware).
 */
export function useSubmissionQueue(
  filters: ReviewContributionKind[],
  sort: ReviewQueueSort,
): UseSubmissionQueueResult {
  const [reloadKey, setReloadKey] = useState(0)
  const [optimisticRemovedIds, setOptimisticRemovedIds] = useState<number[]>([])

  const filtersKey = useMemo(() => [...filters].sort().join(','), [filters])

  const { data, isLoading, error } = useAbortableQuery(
    (signal) => fetchReviewQueue({ filters, sort, signal }),
    {
      initialData: [],
      fallbackErrorMessage: 'Failed to load submission queue',
      deps: [reloadKey, filtersKey, sort],
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
  }, [filtersKey, sort])

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
