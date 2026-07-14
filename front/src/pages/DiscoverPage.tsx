import { useCallback, useMemo, useState } from 'react'
import { useSearch } from '@/app/providers'
import { DiscoverLayout } from '@/app/layouts'
import { WorkspaceNavigationProvider } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { WorkspaceProvider } from '@/features/discover/providers/WorkspaceProvider'
import { useCategories, useResourceMap, useResources, useTags } from '@/hooks'
import {
  getDefaultMapQuery,
  mapQueryKey,
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
        <DiscoverPageContent />
      </WorkspaceNavigationProvider>
    </WorkspaceProvider>
  )
}

function DiscoverPageContent() {
  const { query, setQuery } = useSearch()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedAdvancedFilters, setSelectedAdvancedFilters] = useState<string[]>([])
  const [mapQuery, setMapQuery] = useState<ResourceMapQuery>(() => getDefaultMapQuery())

  const handleViewportQueryChange = useCallback((next: ResourceMapQuery) => {
    setMapQuery((prev) => (mapQueryKey(prev) === mapQueryKey(next) ? prev : next))
  }, [])

  const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories()
  const { tags, isLoading: tagsLoading, error: tagsError } = useTags()
  const { items: mapItems, isLoading: mapLoading, error: mapError } = useResourceMap(mapQuery)

  const resourceFilters = useMemo(
    () => ({
      categoryIds: resolveCategoryIds(selectedCategories, categories),
      tagIds: resolveTagIds(selectedAdvancedFilters, tags),
      search: query.trim() || undefined,
    }),
    [selectedCategories, selectedAdvancedFilters, categories, tags, query],
  )

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
