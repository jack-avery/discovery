import type { ReactNode } from 'react'
import { MapContainer } from '@/features/map'
import { cn } from '@/utils/cn'

interface MapStageProps {
  children?: ReactNode
  className?: string
  mapId?: string
  showDisconnectedOverlay?: boolean
}

/**
 * Full-bleed map stage — primary content area for the Discover experience.
 * Renders the Leaflet mount point and accepts overlay siblings (detail panel).
 */
export function MapStage({
  children,
  className,
  mapId,
  showDisconnectedOverlay,
}: MapStageProps) {
  return (
    <div className={cn('relative min-h-0 flex-1', className)}>
      <MapContainer mapId={mapId} showDisconnectedOverlay={showDisconnectedOverlay} />
      {children}
    </div>
  )
}
