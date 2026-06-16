import type { ReactNode } from 'react'
import { FilterBar, type FilterBarProps } from '@/features/discover/FilterBar'
import { MapContainer } from '@/features/map'
import { cn } from '@/utils/cn'

interface MapStageProps {
  children?: ReactNode
  className?: string
  mapId?: string
  showDisconnectedOverlay?: boolean
  filterBar?: FilterBarProps
}

/**
 * Full-bleed map stage — primary visual canvas for the Discover experience.
 * Renders the Leaflet mount point with floating filter controls and overlay siblings.
 */
export function MapStage({
  children,
  className,
  mapId,
  showDisconnectedOverlay,
  filterBar,
}: MapStageProps) {
  return (
    <div className={cn('relative h-full min-h-0 w-full', className)}>
      <MapContainer mapId={mapId} showDisconnectedOverlay={showDisconnectedOverlay} />
      {filterBar && <FilterBar {...filterBar} />}
      {children}
    </div>
  )
}
