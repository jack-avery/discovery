import { useCallback, useEffect, useState } from 'react'
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
  /**
   * True only until the first map-resources request completes.
   * Use for the full-map overlay — not for background viewport refetches.
   */
  isLoading: boolean
  /** True whenever a map-resources request is in flight (including background). */
  isFetching: boolean
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
 *
 * Loading semantics are scoped here (not in useAbortableQuery) so other hooks keep
 * treating `isLoading` as “request in flight.”
 */
export function useResourceMap(
  query: ResourceMapQuery = getDefaultMapQuery(),
): UseResourceMapResult {
  const [reloadKey, setReloadKey] = useState(0)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const key = mapQueryKey(query)

  const { data, isLoading: isFetching, error } = useAbortableQuery(
    (signal) => fetchMapResources(query, { signal }),
    {
      initialData: EMPTY_RESULT,
      fallbackErrorMessage: "We couldn't load map resources. Please try again.",
      deps: [key, reloadKey],
    },
  )

  useEffect(() => {
    if (!isFetching) {
      setHasLoadedOnce(true)
    }
  }, [isFetching])

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  return {
    markers: data.items,
    items: data.items,
    count: data.count,
    limitations: data.limitations,
    isLoading: isFetching && !hasLoadedOnce,
    isFetching,
    error,
    reload,
  }
}
