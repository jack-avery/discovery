import type { Category, ResourceMapItem } from '@/types'
import type { ResourceMapQuery } from '@/services/mapService'
import { MapContainer } from '@/features/map'
import { useWorkspace } from '@/features/discover/providers/WorkspaceProvider'
import { useDiscoverSideWorkspace } from '@/features/discover/providers/DiscoverSideWorkspaceProvider'
import { DiscoverSideWorkspace } from './DiscoverSideWorkspace'
import { FloatingDiscoveryToolbar } from './FloatingDiscoveryToolbar'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/utils/cn'

interface MapCanvasProps {
  search: string
  onSearchChange: (value: string) => void
  selectedCategories: string[]
  onCategoriesChange: (slugs: string[]) => void
  categories: Category[]
  categoriesLoading?: boolean
  categoriesError?: string | null
  onCategoriesRetry?: () => void
  mapItems?: ResourceMapItem[]
  mapLoading?: boolean
  mapError?: string | null
  onViewportQueryChange?: (query: ResourceMapQuery) => void
  className?: string
}

/**
 * Full-bleed map canvas for the Discover experience.
 * Hosts optional editing overlays that cover the map without unmounting it.
 */
export function MapCanvas({
  search,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  categories,
  categoriesLoading,
  categoriesError,
  onCategoriesRetry,
  mapItems = [],
  mapLoading = false,
  mapError = null,
  onViewportQueryChange,
  className,
}: MapCanvasProps) {
  const isMobile = useIsMobile()
  const { isExpanded } = useWorkspace()
  const { isOpen: sideWorkspaceOpen } = useDiscoverSideWorkspace()

  // Overlay does not change map box size — keep layoutKey independent of it
  // so Leaflet zoom/center/tiles are preserved while the workspace is open.
  // Include mobile/desktop so crossing the md breakpoint re-invalidates size.
  const layoutKey = `${isMobile ? 'mobile' : 'desktop'}-${isExpanded ? 'workspace-expanded' : 'workspace-collapsed'}`

  return (
    <div
      className={cn('relative h-full min-h-0 min-w-0 flex-1', className)}
      data-tour="map"
    >
      <MapContainer
        items={mapItems}
        isLoading={mapLoading}
        error={mapError}
        layoutKey={layoutKey}
        onViewportQueryChange={onViewportQueryChange}
      />

      {!isMobile && !isExpanded && !sideWorkspaceOpen ? (
        <FloatingDiscoveryToolbar
          search={search}
          onSearchChange={onSearchChange}
          categories={categories}
          selectedCategories={selectedCategories}
          onCategoriesChange={onCategoriesChange}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          onCategoriesRetry={onCategoriesRetry}
        />
      ) : null}

      <DiscoverSideWorkspace />
    </div>
  )
}
