import type { ResourceDetail } from '@/types'
import { fetchResourceById } from '@/services/resourceService'
import { useAbortableQuery } from '@/hooks/useAbortableQuery'

interface UseResourceDetailResult {
  resource: ResourceDetail | null
  isLoading: boolean
  error: string | null
}

/**
 * Load a single resource for the workspace detail screen.
 * Re-fetches when `resourceId` changes; aborts the previous request.
 */
export function useResourceDetail(resourceId: string | null): UseResourceDetailResult {
  const { data, isLoading, error } = useAbortableQuery(
    async (signal) => {
      if (!resourceId) return null
      return fetchResourceById(resourceId, { signal })
    },
    {
      initialData: null,
      fallbackErrorMessage: "We couldn't load resource details. Please try again.",
      deps: [resourceId],
    },
  )

  return {
    resource: data,
    isLoading: resourceId ? isLoading : false,
    error: resourceId ? error : null,
  }
}
