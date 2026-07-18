import { DiscoverWorkspace } from '@/features/discover/DiscoverWorkspace'
import { MapCanvas } from '@/features/discover/MapCanvas'
import { StaffSessionControls } from '@/components/shared/StaffSessionControls'
import type { Category, Resource, ResourceMapItem, Tag } from '@/types'
import type { ResourceEmptyReason } from '@/features/resources'
import type { ResourceMapQuery } from '@/services/mapService'
import { FLOATING_FILTER_BAR_Z_CLASS } from '@/features/discover/constants'

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
  tags: Tag[]
  tagsLoading?: boolean
  tagsError?: string | null
  resources: Resource[]
  resourcesTotal: number
  resourcesLoading?: boolean
  resourcesError?: string | null
  resourcesEmptyReason?: ResourceEmptyReason
  mapItems?: ResourceMapItem[]
  mapLoading?: boolean
  mapError?: string | null
  onViewportQueryChange?: (query: ResourceMapQuery) => void
}

export function DiscoverLayout({
  mapItems,
  mapLoading,
  mapError,
  onViewportQueryChange,
  search,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  selectedAdvancedFilters,
  onAdvancedFiltersChange,
  categories,
  categoriesLoading,
  categoriesError,
  tags,
  tagsLoading,
  tagsError,
  resources,
  resourcesTotal,
  resourcesLoading,
  resourcesError,
  resourcesEmptyReason,
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
    tags,
    tagsLoading,
    tagsError,
    resources,
    resourcesTotal,
    resourcesLoading,
    resourcesError,
    resourcesEmptyReason,
  }

  return (
    <div className="relative flex h-full min-h-0">
      <DiscoverWorkspace {...workspaceProps} />
      <MapCanvas
        search={search}
        onSearchChange={onSearchChange}
        mapItems={mapItems}
        mapLoading={mapLoading}
        mapError={mapError}
        onViewportQueryChange={onViewportQueryChange}
        {...categoryProps}
      />
      <div
        className={`pointer-events-none absolute top-3 right-3 sm:top-4 sm:right-4 ${FLOATING_FILTER_BAR_Z_CLASS}`}
      >
        <div className="pointer-events-auto rounded-lg border border-border bg-surface/95 px-2 py-1 shadow-sm backdrop-blur-sm">
          <StaffSessionControls />
        </div>
      </div>
    </div>
  )
}
