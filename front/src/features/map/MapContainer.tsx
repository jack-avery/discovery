import { Loader2 } from 'lucide-react'
import type { ResourceMapItem } from '@/types'
import { cn } from '@/utils/cn'
import { LeafletMap } from './LeafletMap'

interface MapContainerProps {
  className?: string
  items: ResourceMapItem[]
  isLoading?: boolean
  error?: string | null
}

/**
 * Map shell wrapping the Leaflet canvas.
 *
 * Overlays (filter bar, detail panel) render as siblings in MapStage, not inside this section.
 *
 * Reserved control zones for Leaflet:
 * - Top-left: zoom controls (FilterBar offsets with md:left-14)
 * - Bottom-right: attribution
 */
export function MapContainer({
  className,
  items,
  isLoading = false,
  error = null,
}: MapContainerProps) {
  return (
    <section
      aria-label="Resource map"
      className={cn('relative h-full w-full overflow-hidden bg-surface-raised', className)}
    >
      <LeafletMap items={items} />

      {isLoading && (
        <div
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-surface-raised/60"
          role="status"
          aria-live="polite"
          aria-label="Loading map resources"
        >
          <Loader2 className="h-6 w-6 animate-spin text-interactive" aria-hidden="true" />
        </div>
      )}

      {error && (
        <div
          className="pointer-events-none absolute bottom-4 left-1/2 z-[1] -translate-x-1/2 rounded-md border border-danger/30 bg-surface px-3 py-2 text-sm text-danger shadow-md"
          role="alert"
        >
          {error}
        </div>
      )}
    </section>
  )
}
