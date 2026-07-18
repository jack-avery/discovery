import { AlertTriangle } from 'lucide-react'
import type { DevFallbackState } from '@/features/map/config'

interface BasemapDevFallbackBannerProps {
  devFallback: DevFallbackState
}

/** Prominent development-only warning when an explicit fallback provider is in use. */
export function BasemapDevFallbackBanner({ devFallback }: BasemapDevFallbackBannerProps) {
  const intended = devFallback.intendedProviderId ?? 'not configured'

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[3] flex justify-center p-3"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-lg rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-left shadow-md backdrop-blur-sm">
        <div className="flex items-start gap-2.5">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-warning"
            strokeWidth={2}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="font-heading text-xs font-semibold uppercase tracking-wide text-warning">
              Development fallback active
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground">
              Using <strong>{devFallback.fallbackProviderId}</strong> tiles because{' '}
              <strong>{intended}</strong> is not fully configured (
              {devFallback.missingVariables.join(', ')} missing). This fallback is disabled in
              production.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
