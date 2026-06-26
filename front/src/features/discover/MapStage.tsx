import type { ReactNode } from 'react'
import { FilterBar, type FilterBarProps } from '@/features/discover/FilterBar'
import { MapContainer } from '@/features/map'
import type { ResourceMapItem } from '@/types'
import { cn } from '@/utils/cn'

interface MapStageProps {
  children?: ReactNode
  className?: string
  filterBar?: FilterBarProps
  mapItems?: ResourceMapItem[]
  mapLoading?: boolean
  mapError?: string | null
}

/**
 * Full-bleed map stage — primary visual canvas for the Discover experience.
 * Renders the Leaflet map with floating filter controls and overlay siblings.
 */
export function MapStage({
  children,
  className,
  filterBar,
  mapItems = [],
  mapLoading = false,
  mapError = null,
}: MapStageProps) {
  return (
    <div className={cn('relative h-full min-h-0 w-full', className)}>
      <MapContainer items={mapItems} isLoading={mapLoading} error={mapError} />
      {filterBar && <FilterBar {...filterBar} />}
      {children}
    </div>
  )
}
