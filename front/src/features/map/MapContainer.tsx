import { Map } from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { cn } from '@/utils/cn'

interface MapContainerProps {
  className?: string
  /** DOM id for Leaflet mount point — defaults to "resource-map" */
  mapId?: string
  /** Set false once Leaflet is initialized */
  showDisconnectedOverlay?: boolean
}

/**
 * Leaflet-ready map mount point.
 *
 * The `#resource-map` div must remain empty for Leaflet initialization.
 * Overlays (disconnected state, detail panel) render as sibling elements
 * in MapStage, not inside the mount div.
 */
export function MapContainer({
  className,
  mapId = 'resource-map',
  showDisconnectedOverlay = true,
}: MapContainerProps) {
  return (
    <section
      aria-label="Resource map"
      className={cn('relative h-full w-full overflow-hidden bg-surface-raised', className)}
    >
      <div id={mapId} className="absolute inset-0" aria-hidden={showDisconnectedOverlay} />

      {showDisconnectedOverlay && (
        <div
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <EmptyState
            title="Map not connected"
            description="Resource locations will appear on this map once Leaflet integration is configured."
            icon={<Map className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
            className="pointer-events-auto"
          />
        </div>
      )}
    </section>
  )
}
