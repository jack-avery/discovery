import { useAbortableQuery } from '@/hooks/useAbortableQuery'
import {
  fetchFeaturedResources,
  type FeaturedResourceCard,
} from '@/services/resourceService'

interface UseFeaturedResourcesResult {
  resources: FeaturedResourceCard[]
  isLoading: boolean
  error: string | null
}

/**
 * Published resources for the landing “What you can discover” showcase.
 */
export function useFeaturedResources(): UseFeaturedResourcesResult {
  const { data, isLoading, error } = useAbortableQuery(
    (signal) => fetchFeaturedResources({ signal }),
    {
      initialData: [],
      fallbackErrorMessage: 'Failed to load featured resources',
    },
  )

  return { resources: data, isLoading, error }
}
