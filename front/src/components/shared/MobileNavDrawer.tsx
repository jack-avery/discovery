import { useEffect, useId, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useMobileNavMenu } from '@/app/providers/MobileNavMenuProvider'
import { PUBLIC_NAV_ITEMS } from '@/components/shared/publicNavItems'
import { TOUR_TARGETS } from '@/features/discover/tour/tourTargets'
import { isDiscoverTourSessionActive } from '@/features/discover/tour/tourSession'
import { cn } from '@/utils/cn'

interface MobileNavDrawerProps {
  open: boolean
  onClose: () => void
}

/**
 * Mobile-only public navigation drawer.
 * Does not expose staff routes — those remain desktop-only.
 */
export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const { tourContributeLock } = useMobileNavMenu()

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Tour contribute step owns menu visibility — Escape ends the tour elsewhere.
        if (tourContributeLock) return
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, tourContributeLock])

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-surface-overlay"
        aria-label="Close navigation menu"
        onClick={() => {
          if (tourContributeLock) return
          onClose()
        }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col',
          'border-l border-border bg-surface shadow-lg outline-none',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        )}
      >
        <div className="flex h-[var(--ds-header-height)] shrink-0 items-center border-b border-border px-4">
          <p
            id={titleId}
            className="font-heading text-sm font-semibold text-foreground"
          >
            Menu
          </p>
        </div>

        <nav
          className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-thin"
          aria-label="Public navigation"
        >
          {PUBLIC_NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-tour={to === '/submit' ? TOUR_TARGETS.contribute : undefined}
              onClick={(event) => {
                if (to === '/submit' && isDiscoverTourSessionActive()) {
                  event.preventDefault()
                  return
                }
                onClose()
              }}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[var(--ds-min-touch)] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-ring',
                  isActive
                    ? 'bg-interactive-muted font-semibold text-interactive'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
