import type { Category, ResourceMapItem } from '@/types'
import type { ResourceMapQuery } from '@/services/mapService'
import { MapContainer } from '@/features/map'
import { useWorkspace } from '@/features/discover/providers/WorkspaceProvider'
import { FloatingDiscoveryToolbar } from './FloatingDiscoveryToolbar'
import { cn } from '@/utils/cn'

interface MapCanvasProps {
  search: string
  onSearchChange: (value: string) => void
  selectedCategories: string[]
  onCategoriesChange: (slugs: string[]) => void
  categories: Category[]
  categoriesLoading?: boolean
  categoriesError?: string | null
  mapItems?: ResourceMapItem[]
  mapLoading?: boolean
  mapError?: string | null
  onViewportQueryChange?: (query: ResourceMapQuery) => void
  className?: string
}

/**
 * Full-bleed map canvas for the Discover experience.
 * Renders Leaflet map with floating controls when the workspace is collapsed.
 */
export function MapCanvas({
  search,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  categories,
  categoriesLoading,
  categoriesError,
  mapItems = [],
  mapLoading = false,
  mapError = null,
  onViewportQueryChange,
  className,
}: MapCanvasProps) {
  const { isExpanded } = useWorkspace()

  return (
    <div className={cn('relative h-full min-h-0 min-w-0 flex-1', className)}>
      <MapContainer
        items={mapItems}
        isLoading={mapLoading}
        error={mapError}
        layoutKey={isExpanded ? 'workspace-expanded' : 'workspace-collapsed'}
        onViewportQueryChange={onViewportQueryChange}
      />

      {!isExpanded && (
        <FloatingDiscoveryToolbar
          search={search}
          onSearchChange={onSearchChange}
          categories={categories}
          selectedCategories={selectedCategories}
          onCategoriesChange={onCategoriesChange}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
        />
      )}
    </div>
  )
}
