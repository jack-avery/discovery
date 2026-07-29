import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSearch } from '@/app/providers'
import { DiscoverLayout } from '@/app/layouts'
import { WorkspaceNavigationProvider } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { WorkspaceProvider } from '@/features/discover/providers/WorkspaceProvider'
import {
  DiscoverSideWorkspaceProvider,
  useDiscoverSideWorkspace,
} from '@/features/discover/providers/DiscoverSideWorkspaceProvider'
import { DISCOVER_OPEN_UPDATE_QUERY } from '@/features/discover/constants'
import { useCategories, useResourceMap, useResources, useTags } from '@/hooks'
import {
  getDefaultMapQuery,
  mapViewportQueryKey,
  type ResourceMapQuery,
} from '@/services/mapService'
import {
  getResourceEmptyReason,
  resolveCategoryIds,
  resolveTagIds,
} from '@/utils/resource-filters'

export function DiscoverPage() {
  return (
    <WorkspaceProvider>
      <WorkspaceNavigationProvider>
        <DiscoverSideWorkspaceProvider>
          <DiscoverPageContent />
        </DiscoverSideWorkspaceProvider>
      </WorkspaceNavigationProvider>
    </WorkspaceProvider>
  )
}

function DiscoverPageContent() {
  const { query, setQuery } = useSearch()
  const [searchParams, setSearchParams] = useSearchParams()
  const { open: openSideWorkspace } = useDiscoverSideWorkspace()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedAdvancedFilters, setSelectedAdvancedFilters] = useState<string[]>([])
  const [viewportQuery, setViewportQuery] = useState<ResourceMapQuery>(() =>
    getDefaultMapQuery(),
  )

  // Dashboard "Update Existing Resource" opens Discover with this query flag.
  useEffect(() => {
    if (searchParams.get(DISCOVER_OPEN_UPDATE_QUERY) !== '1') return
    openSideWorkspace('update-request')
    const next = new URLSearchParams(searchParams)
    next.delete(DISCOVER_OPEN_UPDATE_QUERY)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, openSideWorkspace])

  const handleViewportQueryChange = useCallback((next: ResourceMapQuery) => {
    setViewportQuery((prev) =>
      mapViewportQueryKey(prev) === mapViewportQueryKey(next) ? prev : next,
    )
  }, [])

  const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories()
  const { tags, isLoading: tagsLoading, error: tagsError } = useTags()

  /** Shared Discover filter state — drives both the resource list and map pins. */
  const resourceFilters = useMemo(
    () => ({
      categoryIds: resolveCategoryIds(selectedCategories, categories),
      tagIds: resolveTagIds(selectedAdvancedFilters, tags),
      search: query.trim() || undefined,
    }),
    [selectedCategories, selectedAdvancedFilters, categories, tags, query],
  )

  const mapQuery = useMemo<ResourceMapQuery>(
    () => ({
      ...viewportQuery,
      categoryIds: resourceFilters.categoryIds,
      tagIds: resourceFilters.tagIds,
      search: resourceFilters.search,
    }),
    [viewportQuery, resourceFilters],
  )

  const { items: mapItems, isLoading: mapLoading, error: mapError } = useResourceMap(mapQuery)

  const {
    resources,
    pagination,
    isLoading: resourcesLoading,
    error: resourcesError,
  } = useResources(resourceFilters)

  const resourcesEmptyReason = getResourceEmptyReason(
    resourceFilters,
    resources.length > 0,
  )

  return (
    <div className="h-full min-h-0">
      <DiscoverLayout
        search={query}
        onSearchChange={setQuery}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        selectedAdvancedFilters={selectedAdvancedFilters}
        onAdvancedFiltersChange={setSelectedAdvancedFilters}
        categories={categories}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesError}
        tags={tags}
        tagsLoading={tagsLoading}
        tagsError={tagsError}
        resources={resources}
        resourcesTotal={pagination.total_items}
        resourcesLoading={resourcesLoading}
        resourcesError={resourcesError}
        resourcesEmptyReason={resourcesEmptyReason}
        mapItems={mapItems}
        mapLoading={mapLoading}
        mapError={mapError}
        onViewportQueryChange={handleViewportQueryChange}
      />
    </div>
  )
}
