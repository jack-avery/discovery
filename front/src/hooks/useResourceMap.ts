import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
 *
 * Unchanged pins (same id + coordinates) reuse prior object identity across
 * refetches so MarkerClusterGroup does not see spurious setLatLng churn.
 */
export function useResourceMap(
  query: ResourceMapQuery = getDefaultMapQuery(),
): UseResourceMapResult {
  const [reloadKey, setReloadKey] = useState(0)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const key = mapQueryKey(query)
  const previousItemsRef = useRef<ResourceMapItem[]>([])

  const { data, isLoading: isFetching, error } = useAbortableQuery(
    (signal) => fetchMapResources(query, { signal }),
    {
      initialData: EMPTY_RESULT,
      fallbackErrorMessage: "We couldn't load map resources. Please try again.",
      deps: [key, reloadKey],
    },
  )

  const stableItems = useMemo(
    () => reconcileMapItems(previousItemsRef.current, data.items),
    [data.items],
  )
  previousItemsRef.current = stableItems

  useEffect(() => {
    if (!isFetching) {
      setHasLoadedOnce(true)
    }
  }, [isFetching])

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  return {
    markers: stableItems,
    items: stableItems,
    count: data.count,
    limitations: data.limitations,
    isLoading: isFetching && !hasLoadedOnce,
    isFetching,
    error,
    reload,
  }
}

/** Reuse prior pin objects when id and coordinates are unchanged. */
function reconcileMapItems(
  previous: ResourceMapItem[],
  next: ResourceMapItem[],
): ResourceMapItem[] {
  if (previous.length === 0) return next
  if (next.length === 0) return next

  const previousById = new Map(previous.map((item) => [item.id, item]))
  let changed = previous.length !== next.length

  const reconciled = next.map((item) => {
    const prior = previousById.get(item.id)
    if (
      prior &&
      prior.location.latitude === item.location.latitude &&
      prior.location.longitude === item.location.longitude &&
      prior.name === item.name &&
      prior.slug === item.slug &&
      prior.categoryName === item.categoryName &&
      prior.iconIdentifier === item.iconIdentifier &&
      prior.resourceType === item.resourceType &&
      prior.isVirtual === item.isVirtual
    ) {
      if (prior.distanceMeters === item.distanceMeters) {
        return prior
      }
      changed = true
      return { ...prior, distanceMeters: item.distanceMeters }
    }
    changed = true
    return item
  })

  if (!changed) {
    for (let i = 0; i < reconciled.length; i += 1) {
      if (reconciled[i] !== previous[i]) {
        changed = true
        break
      }
    }
  }

  return changed ? reconciled : previous
}
