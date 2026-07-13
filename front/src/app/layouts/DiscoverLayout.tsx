import { DiscoverWorkspace } from '@/features/discover/DiscoverWorkspace'
import { MapCanvas } from '@/features/discover/MapCanvas'
import type { Category, ResourceMapItem } from '@/types'

interface DiscoverLayoutProps {
  search: string
  onSearchChange: (value: string) => void
  selectedCategories: string[]
  onCategoriesChange: (slugs: string[]) => void
  selectedAdvancedFilters: string[]
  onAdvancedFiltersChange: (slugs: string[]) => void
  categories: Category[]
  categoriesLoading?: boolean
  categoriesError?: string | null
  mapItems?: ResourceMapItem[]
  mapLoading?: boolean
  mapError?: string | null
}

export function DiscoverLayout({
  mapItems,
  mapLoading,
  mapError,
  search,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  selectedAdvancedFilters,
  onAdvancedFiltersChange,
  categories,
  categoriesLoading,
  categoriesError,
}: DiscoverLayoutProps) {
  const categoryProps = {
    categories,
    selectedCategories,
    onCategoriesChange,
    categoriesLoading,
    categoriesError,
  }

  const workspaceProps = {
    search,
    onSearchChange,
    selectedCategories,
    onCategoriesChange,
    selectedAdvancedFilters,
    onAdvancedFiltersChange,
    categories,
    categoriesLoading,
    categoriesError,
  }

  return (
    <div className="flex h-full min-h-0">
      <DiscoverWorkspace {...workspaceProps} />
      <MapCanvas
        search={search}
        onSearchChange={onSearchChange}
        mapItems={mapItems}
        mapLoading={mapLoading}
        mapError={mapError}
        {...categoryProps}
      />
    </div>
  )
}
