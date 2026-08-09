import { useCallback, useState } from 'react'
import type { PaginationMeta, Resource } from '@/types'
import {
  EMPTY_RESOURCE_LIST,
  fetchResources,
  type ResourceListQuery,
  type ResourceQueryLimitation,
} from '@/services/resourceService'
import { useAbortableQuery } from '@/hooks/useAbortableQuery'

/** Filters accepted by useResources — aligns with ResourceListQuery IDs. */
export interface ResourceFilters {
  categoryIds?: number[]
  tagIds?: number[]
  search?: string
  resourceType?: string
  page?: number
  perPage?: number
}

interface UseResourcesResult {
  resources: Resource[]
  pagination: PaginationMeta
  limitations: ResourceQueryLimitation[]
  isLoading: boolean
  error: string | null
  reload: () => void
}

function toQuery(filters: ResourceFilters): ResourceListQuery {
  return {
    categoryIds: filters.categoryIds,
    tagIds: filters.tagIds,
    search: filters.search,
    resourceType: filters.resourceType,
    page: filters.page,
    perPage: filters.perPage,
  }
}

function filtersKey(filters: ResourceFilters): string {
  return JSON.stringify({
    categoryIds: filters.categoryIds ?? [],
    tagIds: filters.tagIds ?? [],
    search: filters.search?.trim() ?? '',
    resourceType: filters.resourceType ?? '',
    page: filters.page ?? 1,
    perPage: filters.perPage ?? 20,
  })
}

export function useResources(filters: ResourceFilters = {}): UseResourcesResult {
  const [reloadKey, setReloadKey] = useState(0)
  const query = toQuery(filters)
  const key = filtersKey(filters)

  const { data, isLoading, error } = useAbortableQuery(
    (signal) => fetchResources(query, { signal }),
    {
      initialData: EMPTY_RESOURCE_LIST,
      fallbackErrorMessage: "We couldn't load resources. Please try again.",
      deps: [key, reloadKey],
    },
  )

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  return {
    resources: data.resources,
    pagination: data.pagination,
    limitations: data.limitations,
    isLoading,
    error,
    reload,
  }
}
