import { useState } from 'react'
import { useSearch } from '@/app/providers'
import { DiscoverLayout } from '@/app/layouts'
import { WorkspaceNavigationProvider } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { WorkspaceProvider } from '@/features/discover/providers/WorkspaceProvider'
import { useCategories, useResourceMap } from '@/hooks'

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

  const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories()
  const { items: mapItems, isLoading: mapLoading, error: mapError } = useResourceMap()

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
        mapItems={mapItems}
        mapLoading={mapLoading}
        mapError={mapError}
      />
    </div>
  )
}
