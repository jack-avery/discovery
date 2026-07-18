import { MapPin } from 'lucide-react'
import type { BasemapConfigError } from '@/features/map/config'

interface BasemapErrorOverlayProps {
  error: BasemapConfigError
}

/** Friendly overlay when the basemap cannot be loaded (e.g. missing API key). */
export function BasemapErrorOverlay({ error }: BasemapErrorOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-surface-raised/80 p-6"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-md rounded-lg border border-border bg-surface px-5 py-4 text-center shadow-md">
        <MapPin
          className="mx-auto mb-3 h-8 w-8 text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="font-heading text-sm font-semibold text-foreground">Map unavailable</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{error.userMessage}</p>

        {import.meta.env.DEV && error.developerDetails && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-left text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {error.developerDetails}
          </pre>
        )}
      </div>
    </div>
  )
}
