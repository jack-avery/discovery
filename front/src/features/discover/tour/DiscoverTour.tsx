import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui'
import { useDiscoverTour } from '@/features/discover/tour/DiscoverTourProvider'
import {
  placeExploreMapTourLayout,
  placeTourCard,
  TOUR_CARD_MAX_WIDTH_PX,
  type RectLike,
  type TourCardPosition,
} from '@/features/discover/tour/tourPlacement'
import {
  buildBlockingPanels,
  expandTargetRectWithContainedOverlays,
  isTourTargetInteractive,
  rectFromDomRect,
  type BlockingPanel,
} from '@/features/discover/tour/spotlightInteraction'
import { findTourTarget, resolveDetailsStepTarget, TOUR_TARGETS } from '@/features/discover/tour/tourTargets'
import {
  scrollResourceDetailToTop,
  scrollTourTargetIntoDetailView,
} from '@/features/discover/tour/tourDom'
import { isResourceDetailIntroStep } from '@/features/discover/tour/tourSteps'
import { TOUR_CLOSE_LABEL } from '@/features/discover/tour/tourSession'
import { useTourEscape } from '@/features/discover/tour/useTourEscape'
import { useWorkspaceNavigation } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { cn } from '@/utils/cn'

const ESTIMATED_CARD_HEIGHT = 220

/**
 * Spotlight overlay + coachmark for the Discover guided tour.
 *
 * Placement:
 * - Panel-target steps: coachmark docked beside the workspace (Mode A)
 * - Explore-map: coachmark over the workspace; full map spotlight (Mode B)
 */
export function DiscoverTour() {
  const {
    isActive,
    step,
    stepIndex,
    stepCount,
    isFirstStep,
    isLastStep,
    next,
    back,
    skip,
    finish,
  } = useDiscoverTour()
  const { current, selectedResourceId } = useWorkspaceNavigation()
  const isResourceDetailActive =
    current.id === 'resource-detail' && Boolean(selectedResourceId)

  const titleId = useId()
  const descriptionId = useId()
  const cardRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [spotlight, setSpotlight] = useState<RectLike | null>(null)
  const [blockingPanels, setBlockingPanels] = useState<BlockingPanel[]>([])
  const [cardPosition, setCardPosition] = useState<TourCardPosition | null>(null)
  const [cardWidthPx, setCardWidthPx] = useState(TOUR_CARD_MAX_WIDTH_PX)
  const [reduceMotion, setReduceMotion] = useState(false)
  const lastStepIndexForScrollRef = useRef<number | null>(null)
  const lastFocusedStepRef = useRef<number | null>(null)

  useTourEscape({ active: isActive, onEscape: skip })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  // Announce step changes after layout settles (including auto-advance).
  useEffect(() => {
    if (!isActive || !step) return
    if (lastFocusedStepRef.current === stepIndex) return
    lastFocusedStepRef.current = stepIndex
    const frame = window.requestAnimationFrame(() => {
      titleRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isActive, step, stepIndex])

  const measure = useCallback(
    (options?: { scrollIntoView?: boolean }) => {
      if (!isActive || !step) {
        setSpotlight(null)
        setBlockingPanels([])
        setCardPosition(null)
        return
      }

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const measuredCardHeight =
        cardRef.current?.getBoundingClientRect().height ?? ESTIMATED_CARD_HEIGHT
      const measuredCardWidth = Math.min(
        TOUR_CARD_MAX_WIDTH_PX,
        viewportWidth - 24,
      )

      const mapEl = findTourTarget(TOUR_TARGETS.map)
      const workspaceEl = findTourTarget(TOUR_TARGETS.workspace)
      const mapRegion = mapEl
        ? rectFromDomRect(mapEl.getBoundingClientRect())
        : null
      const workspace = workspaceEl
        ? rectFromDomRect(workspaceEl.getBoundingClientRect())
        : null

      // Mode B — Explore the map: full map spotlight, coachmark over panel.
      if (step.id === 'explore-map' && mapRegion && workspace) {
        const layout = placeExploreMapTourLayout({
          mapRegion,
          workspace,
          cardWidth: measuredCardWidth,
          cardHeight: measuredCardHeight,
          viewportWidth,
          viewportHeight,
        })
        setSpotlight(layout.spotlight)
        setBlockingPanels(
          buildBlockingPanels(layout.spotlight, viewportWidth, viewportHeight),
        )
        setCardPosition(layout.card)
        setCardWidthPx(layout.cardWidth)
        return
      }

      const primary = resolvePrimaryTarget(step.id, step.targetId, {
        isResourceDetailActive,
        selectedResourceId,
      })
      const allowInteraction = isTourTargetInteractive(step.id)

      if (!primary) {
        setSpotlight(null)
        setBlockingPanels([
          { top: 0, left: 0, width: viewportWidth, height: viewportHeight },
        ])
        setCardPosition(
          placeTourCard({
            target: null,
            workspace,
            mapRegion,
            cardWidth: measuredCardWidth,
            cardHeight: measuredCardHeight,
            viewportWidth,
            viewportHeight,
          }),
        )
        setCardWidthPx(measuredCardWidth)
        return
      }

      if (options?.scrollIntoView) {
        if (step.id === 'update-resource') {
          scrollTourTargetIntoDetailView(primary, reduceMotion)
        } else if (isResourceDetailIntroStep(step.id)) {
          // Detail intro steps: keep Resource Detail at its normal top.
          scrollResourceDetailToTop(reduceMotion)
        } else {
          primary.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
            behavior: reduceMotion ? 'auto' : 'smooth',
          })
        }
      }

      const spotlightRect = expandTargetRectWithContainedOverlays(primary)
      setSpotlight(spotlightRect)

      const interactionHole: RectLike | null = allowInteraction
        ? spotlightRect
        : null

      if (!allowInteraction || !interactionHole) {
        setBlockingPanels([
          { top: 0, left: 0, width: viewportWidth, height: viewportHeight },
        ])
      } else {
        setBlockingPanels(
          buildBlockingPanels(interactionHole, viewportWidth, viewportHeight),
        )
      }

      setCardPosition(
        placeTourCard({
          target: spotlightRect,
          workspace,
          mapRegion,
          cardWidth: measuredCardWidth,
          cardHeight: measuredCardHeight,
          viewportWidth,
          viewportHeight,
        }),
      )
      setCardWidthPx(measuredCardWidth)
    },
    [isActive, step, reduceMotion, isResourceDetailActive, selectedResourceId],
  )

  useLayoutEffect(() => {
    if (!isActive) return
    const shouldScroll = lastStepIndexForScrollRef.current !== stepIndex
    lastStepIndexForScrollRef.current = stepIndex
    measure({ scrollIntoView: shouldScroll })
    const frame = window.requestAnimationFrame(() =>
      measure({ scrollIntoView: false }),
    )
    const timeout = window.setTimeout(
      () => measure({ scrollIntoView: false }),
      80,
    )
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [isActive, stepIndex, measure])

  useEffect(() => {
    if (!isActive) return
    let timer: number | undefined
    const remasure = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => measure({ scrollIntoView: false }), 50)
    }
    window.addEventListener('resize', remasure)
    window.addEventListener('scroll', remasure, true)

    const observer = new MutationObserver(remasure)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-expanded'],
    })

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', remasure)
      window.removeEventListener('scroll', remasure, true)
      observer.disconnect()
    }
  }, [isActive, measure])

  if (!isActive || !step || !cardPosition) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" role="presentation">
      {spotlight ? (
        <div
          aria-hidden="true"
          className={cn(
            'absolute rounded-lg ring-2 ring-interactive',
            !reduceMotion && 'transition-[top,left,width,height] duration-200',
          )}
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow:
              '0 0 0 9999px color-mix(in srgb, var(--ds-foreground) 40%, transparent)',
          }}
        />
      ) : (
        <div
          className="absolute inset-0 bg-foreground/40"
          aria-hidden="true"
        />
      )}

      {blockingPanels.map((panel, index) => (
        <div
          key={`block-${index}`}
          aria-hidden="true"
          className="pointer-events-auto absolute"
          data-tour-block=""
          style={{
            top: panel.top,
            left: panel.left,
            width: panel.width,
            height: panel.height,
          }}
        />
      ))}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-live="polite"
        className={cn(
          'pointer-events-auto absolute z-10 max-w-[min(23.75rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-surface p-4 shadow-lg',
          !reduceMotion && 'transition-[top,left] duration-200',
        )}
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
          width: cardWidthPx,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {stepIndex + 1} of {stepCount}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 min-h-0 min-w-0 shrink-0"
            onClick={skip}
            aria-label={TOUR_CLOSE_LABEL}
            title={TOUR_CLOSE_LABEL}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <h2
          ref={titleRef}
          id={titleId}
          tabIndex={-1}
          className="mt-1 font-heading text-base font-semibold text-foreground outline-none"
        >
          {step.heading}
        </h2>
        <p
          id={descriptionId}
          className="mt-2 text-sm leading-relaxed text-muted-foreground"
        >
          {step.body}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {!isFirstStep ? (
            <Button type="button" variant="secondary" size="sm" onClick={back}>
              Back
            </Button>
          ) : null}
          {isLastStep ? (
            <Button type="button" variant="primary" size="sm" onClick={finish}>
              Finish
            </Button>
          ) : (
            <Button type="button" variant="primary" size="sm" onClick={next}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function resolvePrimaryTarget(
  stepId: string,
  targetId: string,
  navigation: {
    isResourceDetailActive: boolean
    selectedResourceId: string | null
  },
): HTMLElement | null {
  if (isResourceDetailIntroStep(stepId)) {
    return resolveDetailsStepTarget({
      isResourceDetailActive: navigation.isResourceDetailActive,
      selectedResourceId: navigation.selectedResourceId,
    })
  }
  if (stepId === 'update-resource') {
    return (
      findTourTarget(TOUR_TARGETS.updateResource) ??
      findTourTarget(TOUR_TARGETS.resourceDetail)
    )
  }
  return findTourTarget(targetId)
}
