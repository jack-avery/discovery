import { useCallback, useState } from 'react'
import type { ResourceMapItem } from '@/types'
import {
  fetchMapResources,
  getDefaultMapQuery,
  mapQueryKey,
  type ResourceMapQuery,
  type ResourceMapQueryLimitation,
} from '@/services/mapService'
import { useAbortableQuery } from '@/hooks/useAbortableQuery'

interface UseResourceMapResult {
  /** Live map markers (preferred name). */
  markers: ResourceMapItem[]
  /** Alias for markers — existing Discover/Map pages use `items`. */
  items: ResourceMapItem[]
  count: number
  limitations: ResourceMapQueryLimitation[]
  isLoading: boolean
  error: string | null
  reload: () => void
}

const EMPTY_RESULT = {
  items: [] as ResourceMapItem[],
  count: 0,
  limitations: [] as ResourceMapQueryLimitation[],
}

/**
 * Load map pins for a lat/lng/radius query.
 * Pass viewport-derived queries from MapViewportReporter; defaults to MAP_BEHAVIOUR centre.
 */
export function useResourceMap(
  query: ResourceMapQuery = getDefaultMapQuery(),
): UseResourceMapResult {
  const [reloadKey, setReloadKey] = useState(0)
  const key = mapQueryKey(query)

  const { data, isLoading, error } = useAbortableQuery(
    (signal) => fetchMapResources(query, { signal }),
    {
      initialData: EMPTY_RESULT,
      fallbackErrorMessage: 'Failed to load map resources',
      deps: [key, reloadKey],
    },
  )

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  return {
    markers: data.items,
    items: data.items,
    count: data.count,
    limitations: data.limitations,
    isLoading,
    error,
    reload,
  }
}
