import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ChevronLeft, Route } from 'lucide-react'
import { Button } from '@/components/ui'
import { useDiscoverTour } from '@/features/discover/tour'
import type { DiscoverScreenProps } from '@/features/discover/DiscoverScreen'
import { WorkspaceNavigationStack } from '@/features/discover/WorkspaceNavigationStack'
import { useWorkspaceNavigation } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { useWorkspace } from '@/features/discover/providers/WorkspaceProvider'
import { cn } from '@/utils/cn'
import { MOBILE_DISCOVER_SHEET_HEIGHT } from '@/features/discover/mobileDiscoverSheet'

type SheetSnap = 'collapsed' | 'mid' | 'expanded'

/** Fraction of the Discover map area height for each snap state. */
const SHEET_HEIGHT: Record<SheetSnap, number> = {
  collapsed: MOBILE_DISCOVER_SHEET_HEIGHT.collapsed,
  mid: MOBILE_DISCOVER_SHEET_HEIGHT.mid,
  expanded: MOBILE_DISCOVER_SHEET_HEIGHT.expanded,
}

const SNAP_ORDER: SheetSnap[] = ['collapsed', 'mid', 'expanded']

function nearestSnap(fraction: number): SheetSnap {
  let best: SheetSnap = 'mid'
  let bestDist = Number.POSITIVE_INFINITY
  for (const snap of SNAP_ORDER) {
    const dist = Math.abs(SHEET_HEIGHT[snap] - fraction)
    if (dist < bestDist) {
      best = snap
      bestDist = dist
    }
  }
  return best
}

function nextSnap(current: SheetSnap): SheetSnap {
  if (current === 'collapsed') return 'mid'
  if (current === 'mid') return 'expanded'
  return 'mid'
}

/**
 * Mobile-only Discover workspace as a Google Maps–style bottom sheet over the map.
 * Reuses WorkspaceNavigationStack (search, filters, results, resource detail).
 * Desktop DiscoverWorkspace is unchanged and not mounted alongside this.
 */
export function MobileDiscoverBottomSheet(props: DiscoverScreenProps) {
  const { expand } = useWorkspace()
  const { canGoBack, pop, current, resetToRoot } = useWorkspaceNavigation()
  const { startTour, isActive, step } = useDiscoverTour()

  const [snap, setSnap] = useState<SheetSnap>('mid')
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const dragHeightRef = useRef<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startY: number
    startHeightPx: number
    containerHeightPx: number
    moved: boolean
  } | null>(null)

  // Keep the desktop floating toolbar from appearing on mobile.
  useEffect(() => {
    expand()
  }, [expand])

  // Resource detail reads best in the expanded sheet.
  useEffect(() => {
    if (current.id === 'resource-detail') {
      setSnap('expanded')
    }
  }, [current.id])

  /**
   * Guided tour "Explore the map" (`explore-map`): close resource details and
   * collapse the sheet so pins are visible/tappable. Re-runs when entering the
   * step (Next or Back). Declared after the detail-expand effect so collapse
   * wins when both run in the same commit. Does not re-collapse after a pin
   * opens detail for auto-advance (step id unchanged).
   */
  useEffect(() => {
    if (!isActive || step?.id !== 'explore-map') return
    resetToRoot()
    setDragHeight(null)
    dragHeightRef.current = null
    setSnap('collapsed')
  }, [isActive, step?.id, resetToRoot])

  const heightFraction = dragHeight ?? SHEET_HEIGHT[snap]

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    const sheet = sheetRef.current
    const parent = sheet?.parentElement
    if (!sheet || !parent) return

    const containerHeightPx = parent.getBoundingClientRect().height
    if (containerHeightPx <= 0) return

    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeightPx: sheet.getBoundingClientRect().height,
      containerHeightPx,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaY = drag.startY - event.clientY
    if (Math.abs(deltaY) > 4) drag.moved = true

    const nextPx = Math.min(
      drag.containerHeightPx * SHEET_HEIGHT.expanded,
      Math.max(
        drag.containerHeightPx * SHEET_HEIGHT.collapsed,
        drag.startHeightPx + deltaY,
      ),
    )
    const nextFraction = nextPx / drag.containerHeightPx
    dragHeightRef.current = nextFraction
    setDragHeight(nextFraction)
  }, [])

  const endDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const fraction =
      dragHeightRef.current ?? drag.startHeightPx / drag.containerHeightPx

    if (!drag.moved) {
      setSnap((prev) => nextSnap(prev))
    } else {
      setSnap(nearestSnap(fraction))
    }

    dragHeightRef.current = null
    setDragHeight(null)
    dragRef.current = null
  }, [])

  const showingDetail = canGoBack && current.id === 'resource-detail'

  return (
    <div
      ref={sheetRef}
      data-tour="workspace"
      className={cn(
        'absolute inset-x-0 bottom-0 z-[25] flex flex-col',
        'rounded-t-xl border border-border border-b-0 bg-surface shadow-lg',
        'pb-[env(safe-area-inset-bottom)]',
        dragHeight == null && 'transition-[height] duration-200 ease-out',
      )}
      style={{
        height: `${heightFraction * 100}%`,
        // Sheet must not cover the full map with an invisible hit target —
        // only this box receives pointer events.
        pointerEvents: 'auto',
      }}
      role="region"
      aria-label="Discover resources"
    >
      <div
        className="flex shrink-0 touch-none flex-col items-center pt-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="button"
        tabIndex={0}
        aria-label="Drag or tap to resize Discover panel"
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setSnap((prev) => nextSnap(prev))
          }
        }}
      >
        <div
          className="h-1 w-10 rounded-full bg-border"
          aria-hidden="true"
        />
        <span className="sr-only">
          Panel {snap}. Drag to resize.
        </span>
      </div>

      <div className="flex h-[var(--ds-header-height)] shrink-0 items-center gap-1 border-b border-border px-2">
        {showingDetail ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={pop}
              aria-label="Back to Discover"
              title="Back to Discover"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <h2 className="min-w-0 flex-1 truncate font-heading text-base font-semibold text-foreground">
              Resource details
            </h2>
          </>
        ) : (
          <>
            <h2 className="min-w-0 flex-1 truncate px-2 font-heading text-base font-semibold text-foreground">
              Discover Resources
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isActive}
              onClick={startTour}
              className="shrink-0 gap-1.5 text-muted-foreground"
              aria-label="Take a tour"
              title="Take a tour"
            >
              <Route className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <WorkspaceNavigationStack discoverProps={props} />
      </div>
    </div>
  )
}
