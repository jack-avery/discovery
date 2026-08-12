import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useDiscoverSideWorkspace } from '@/features/discover/providers/DiscoverSideWorkspaceProvider'
import { useWorkspaceNavigation } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { useWorkspace } from '@/features/discover/providers/WorkspaceProvider'
import { useMobileNavMenu } from '@/app/providers/MobileNavMenuProvider'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  MAP_SELECTION_AUTO_ADVANCE_STEP_ID,
  RESULTS_SELECTION_AUTO_ADVANCE_STEP_ID,
  shouldAutoAdvanceFromMap,
  shouldAutoAdvanceFromResults,
  tourAutoAdvanceGuardKey,
} from '@/features/discover/tour/tourAutoAdvance'
import {
  DISCOVER_TOUR_STEPS,
  DISCOVER_TOUR_STEP_COUNT,
  getTourStepIndexById,
  isFirstTourStep,
  isLastTourStep,
  isResourceDetailIntroStep,
  type DiscoverTourStep,
} from '@/features/discover/tour/tourSteps'
import { findTourTarget, TOUR_TARGETS } from '@/features/discover/tour/tourTargets'
import {
  requiresResourceDetailStep,
  shouldOpenMobileNavForTourStep,
  shouldResetToRootBeforeStep,
} from '@/features/discover/tour/spotlightInteraction'
import { setDiscoverTourSessionActive } from '@/features/discover/tour/tourSession'
import {
  pickFirstTourResourceId,
  resolveTourDemoResourceId,
} from '@/features/discover/tour/tourResourceCatalog'
import {
  scrollResourceDetailToTop,
  scrollTourTargetIntoDetailView,
  waitForTourTarget,
} from '@/features/discover/tour/tourDom'

interface DiscoverTourContextValue {
  isActive: boolean
  stepIndex: number
  step: DiscoverTourStep | null
  stepCount: number
  isFirstStep: boolean
  isLastStep: boolean
  /** Resource id preserved for Update Resource / Back transitions. */
  demoResourceId: string | null
  startTour: () => void
  next: () => void
  back: () => void
  skip: () => void
  finish: () => void
}

const DiscoverTourContext = createContext<DiscoverTourContextValue | null>(null)

const DETAIL_SETTLE_MS = 80

/**
 * Prepare Discover UI for the tour: expanded workspace, Discover root screen,
 * no side panel. Clears any Resource Detail stack entry so Results is visible.
 */
export function prepareDiscoverForTour(args: {
  expand: () => void
  resetToRoot: () => void
  closeSideWorkspace: () => void
}): void {
  args.closeSideWorkspace()
  args.resetToRoot()
  args.expand()
}

/** True when the workspace navigation stack is on the Discover list root. */
export function isDiscoverNavigationRoot(currentId: string): boolean {
  return currentId === 'discover'
}

/**
 * Resolve which step index to show when the preferred target is missing.
 * Advances forward (or backward when stepping back) until a live target exists.
 */
export function resolveAvailableTourStepIndex(args: {
  fromIndex: number
  direction: 'forward' | 'backward'
  steps?: readonly DiscoverTourStep[]
  findTarget?: typeof findTourTarget
  canShowUpdateResourceStep?: boolean
}): number | null {
  const steps = args.steps ?? DISCOVER_TOUR_STEPS
  const findTarget = args.findTarget ?? findTourTarget
  const delta = args.direction === 'forward' ? 1 : -1

  for (
    let index = args.fromIndex;
    index >= 0 && index < steps.length;
    index += delta
  ) {
    const step = steps[index]
    if (
      (step.id === 'update-resource' || step.id === 'map-details') &&
      args.canShowUpdateResourceStep === false
    ) {
      continue
    }
    if (step.id === 'update-resource') {
      return index
    }
    // Detail intro steps require an open resource — skip when resolving availability.
    if (isResourceDetailIntroStep(step.id)) {
      const detail = findTarget(TOUR_TARGETS.resourceDetail)
      if (detail) return index
      continue
    }
    const candidates = [step.targetId, ...(step.fallbackTargetIds ?? [])]
    if (candidates.some((id) => findTarget(id))) {
      return index
    }
  }
  return null
}

export function DiscoverTourProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  const { setTourContributeLock } = useMobileNavMenu()
  const { expand } = useWorkspace()
  const {
    resetToRoot,
    openResourceDetail,
    selectedResourceId,
    lastResourceOpenOrigin,
  } = useWorkspaceNavigation()
  const { close: closeSideWorkspace } = useDiscoverSideWorkspace()

  const [isActive, setIsActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [demoResourceId, setDemoResourceId] = useState<string | null>(null)
  /** Resource opened from the Results list (Step 3 → 4). */
  const [resultsResourceId, setResultsResourceId] = useState<string | null>(null)
  /** Resource opened from a map pin (Step 5 → 6). */
  const [mapResourceId, setMapResourceId] = useState<string | null>(null)
  const navigatingRef = useRef(false)
  const reduceMotionRef = useRef(false)
  const autoAdvanceGuardRef = useRef<string | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      reduceMotionRef.current = media.matches
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!isActive || !selectedResourceId) return
    setDemoResourceId(selectedResourceId)
  }, [isActive, selectedResourceId])

  const step = isActive ? (DISCOVER_TOUR_STEPS[stepIndex] ?? null) : null

  /**
   * Mobile-only: open the hamburger menu for "Share what you know" (`contribute`)
   * so the real Contribute Resource nav item is the tour target. Desktop rail
   * already exposes that target — leave it alone.
   */
  useEffect(() => {
    if (!isMobile) {
      setTourContributeLock(false)
      return
    }
    setTourContributeLock(
      shouldOpenMobileNavForTourStep(step?.id, true),
    )
  }, [isMobile, isActive, step?.id, setTourContributeLock])

  useEffect(() => {
    return () => setTourContributeLock(false)
  }, [setTourContributeLock])

  const endTour = useCallback(() => {
    setIsActive(false)
    setStepIndex(0)
    setDemoResourceId(null)
    setResultsResourceId(null)
    setMapResourceId(null)
    autoAdvanceGuardRef.current = null
    setDiscoverTourSessionActive(false)
    setTourContributeLock(false)
    expand()
  }, [expand, setTourContributeLock])

  const openDemoResourceDetail = useCallback(
    async (
      resourceId: string,
      options?: { scrollToUpdate?: boolean },
    ): Promise<boolean> => {
      setDemoResourceId(resourceId)
      openResourceDetail(resourceId, { origin: 'programmatic' })

      if (options?.scrollToUpdate === false) {
        const detail = await waitForTourTarget(TOUR_TARGETS.resourceDetail, {
          timeoutMs: 5000,
        })
        if (!detail) return false
        scrollResourceDetailToTop(reduceMotionRef.current)
        await new Promise((resolve) =>
          window.setTimeout(resolve, DETAIL_SETTLE_MS),
        )
        return true
      }

      const updateTarget = await waitForTourTarget(TOUR_TARGETS.updateResource, {
        timeoutMs: 5000,
      })
      if (!updateTarget) return false
      scrollTourTargetIntoDetailView(updateTarget, reduceMotionRef.current)
      await new Promise((resolve) =>
        window.setTimeout(resolve, DETAIL_SETTLE_MS + 40),
      )
      return true
    },
    [openResourceDetail],
  )

  const prepareUpdateResourceStep = useCallback(async (): Promise<boolean> => {
    const resourceId = resolveTourDemoResourceId({
      selectedResourceId,
      preservedResourceId: mapResourceId ?? demoResourceId,
    })
    if (!resourceId) return false

    if (
      selectedResourceId === resourceId &&
      findTourTarget(TOUR_TARGETS.updateResource)
    ) {
      const target = findTourTarget(TOUR_TARGETS.updateResource)
      if (target) {
        scrollTourTargetIntoDetailView(target, reduceMotionRef.current)
        await new Promise((resolve) =>
          window.setTimeout(resolve, DETAIL_SETTLE_MS),
        )
      }
      setDemoResourceId(resourceId)
      return true
    }

    return openDemoResourceDetail(resourceId, { scrollToUpdate: true })
  }, [
    selectedResourceId,
    demoResourceId,
    mapResourceId,
    openDemoResourceDetail,
  ])

  const prepareMapDetailsStep = useCallback(
    async (resourceId: string): Promise<boolean> => {
      setMapResourceId(resourceId)
      setDemoResourceId(resourceId)

      if (selectedResourceId !== resourceId) {
        openResourceDetail(resourceId, { origin: 'programmatic' })
      }

      const detail = await waitForTourTarget(TOUR_TARGETS.resourceDetail, {
        timeoutMs: 5000,
      })
      if (!detail) return false
      scrollResourceDetailToTop(reduceMotionRef.current)
      await new Promise((resolve) =>
        window.setTimeout(resolve, DETAIL_SETTLE_MS),
      )
      return true
    },
    [selectedResourceId, openResourceDetail],
  )

  const goToStepIndex = useCallback((index: number) => {
    setStepIndex(index)
  }, [])

  const advanceAfterDetailReady = useCallback(
    async (targetStepId: string, resourceId: string) => {
      if (navigatingRef.current) return
      navigatingRef.current = true
      try {
        setDemoResourceId(resourceId)
        const detail = await waitForTourTarget(TOUR_TARGETS.resourceDetail, {
          timeoutMs: 5000,
        })
        if (!detail) return

        if (targetStepId === RESULTS_SELECTION_AUTO_ADVANCE_STEP_ID) {
          setResultsResourceId(resourceId)
          scrollResourceDetailToTop(reduceMotionRef.current)
        }

        if (targetStepId === MAP_SELECTION_AUTO_ADVANCE_STEP_ID) {
          setMapResourceId(resourceId)
          // Show the opened resource at the top — never jump to Update Resource.
          scrollResourceDetailToTop(reduceMotionRef.current)
        }

        await new Promise((resolve) =>
          window.setTimeout(resolve, DETAIL_SETTLE_MS),
        )

        const index = getTourStepIndexById(targetStepId)
        if (index >= 0) goToStepIndex(index)
      } finally {
        navigatingRef.current = false
      }
    },
    [goToStepIndex],
  )

  // Auto-advance: results → details; map pin → map-details only (never update).
  useEffect(() => {
    if (!isActive || navigatingRef.current) return
    const step = DISCOVER_TOUR_STEPS[stepIndex]
    if (!step || !selectedResourceId || !lastResourceOpenOrigin) return

    const fromResults = shouldAutoAdvanceFromResults({
      stepId: step.id,
      origin: lastResourceOpenOrigin,
      selectedResourceId,
    })
    const fromMap = shouldAutoAdvanceFromMap({
      stepId: step.id,
      origin: lastResourceOpenOrigin,
      selectedResourceId,
    })
    if (!fromResults && !fromMap) return

    const guard = tourAutoAdvanceGuardKey({
      stepId: step.id,
      resourceId: selectedResourceId,
      origin: lastResourceOpenOrigin,
    })
    if (autoAdvanceGuardRef.current === guard) return
    autoAdvanceGuardRef.current = guard

    const nextStepId = fromResults
      ? RESULTS_SELECTION_AUTO_ADVANCE_STEP_ID
      : MAP_SELECTION_AUTO_ADVANCE_STEP_ID
    void advanceAfterDetailReady(nextStepId, selectedResourceId)
  }, [
    isActive,
    stepIndex,
    selectedResourceId,
    lastResourceOpenOrigin,
    advanceAfterDetailReady,
  ])

  const startTour = useCallback(() => {
    prepareDiscoverForTour({ expand, resetToRoot, closeSideWorkspace })
    setDemoResourceId(null)
    setResultsResourceId(null)
    setMapResourceId(null)
    autoAdvanceGuardRef.current = null
    // Double-reset on the next frame so any in-flight openResourceDetail
    // cannot leave a resource-detail screen without a valid id.
    window.requestAnimationFrame(() => {
      resetToRoot()
      expand()
      const resolved =
        resolveAvailableTourStepIndex({
          fromIndex: 0,
          direction: 'forward',
        }) ?? 0
      setStepIndex(resolved)
      setIsActive(true)
      setDiscoverTourSessionActive(true)
    })
  }, [expand, resetToRoot, closeSideWorkspace])

  const next = useCallback(() => {
    if (navigatingRef.current) return
    if (isLastTourStep(stepIndex)) {
      endTour()
      return
    }

    const current = DISCOVER_TOUR_STEPS[stepIndex]
    const tentativeNext = stepIndex + 1
    const nextStep = DISCOVER_TOUR_STEPS[tentativeNext]
    if (!nextStep) {
      endTour()
      return
    }

    void (async () => {
      navigatingRef.current = true
      try {
        // Step 3 Next fallback: open first result → details, or skip ahead.
        if (current?.id === 'results') {
          const resourceId = resolveTourDemoResourceId({
            selectedResourceId,
            preservedResourceId: demoResourceId,
          })
          if (!resourceId) {
            const mapIndex = getTourStepIndexById('explore-map')
            if (mapIndex >= 0) {
              resetToRoot()
              expand()
              goToStepIndex(mapIndex)
              return
            }
            const contributeIndex = getTourStepIndexById('contribute')
            resetToRoot()
            expand()
            if (contributeIndex >= 0) goToStepIndex(contributeIndex)
            return
          }
          setResultsResourceId(resourceId)
          setDemoResourceId(resourceId)
          openResourceDetail(resourceId, { origin: 'programmatic' })
          const detail = await waitForTourTarget(TOUR_TARGETS.resourceDetail, {
            timeoutMs: 5000,
          })
          if (!detail) {
            const mapIndex = getTourStepIndexById('explore-map')
            resetToRoot()
            expand()
            if (mapIndex >= 0) goToStepIndex(mapIndex)
            return
          }
          scrollResourceDetailToTop(reduceMotionRef.current)
          await new Promise((resolve) =>
            window.setTimeout(resolve, DETAIL_SETTLE_MS),
          )
          const detailsIndex = getTourStepIndexById('details')
          if (detailsIndex >= 0) goToStepIndex(detailsIndex)
          return
        }

        // Step 4 → Step 5: return to Discover root / map.
        if (current?.id === 'details' && nextStep.id === 'explore-map') {
          resetToRoot()
          expand()
          goToStepIndex(tentativeNext)
          return
        }

        // Step 5 Next fallback: open a resource → map-details (top), not update.
        if (current?.id === 'explore-map') {
          const resourceId = resolveTourDemoResourceId({
            selectedResourceId,
            preservedResourceId: demoResourceId,
          })
          if (!resourceId) {
            const contributeIndex = getTourStepIndexById('contribute')
            resetToRoot()
            expand()
            if (contributeIndex >= 0) goToStepIndex(contributeIndex)
            return
          }
          const ready = await prepareMapDetailsStep(resourceId)
          if (!ready) {
            const contributeIndex = getTourStepIndexById('contribute')
            resetToRoot()
            expand()
            if (contributeIndex >= 0) goToStepIndex(contributeIndex)
            return
          }
          const mapDetailsIndex = getTourStepIndexById('map-details')
          if (mapDetailsIndex >= 0) goToStepIndex(mapDetailsIndex)
          return
        }

        // Step 6 → Step 7: keep the same map-selected resource; scroll to Update.
        if (current?.id === 'map-details' && nextStep.id === 'update-resource') {
          const ready = await prepareUpdateResourceStep()
          if (!ready) {
            const contributeIndex = getTourStepIndexById('contribute')
            resetToRoot()
            expand()
            if (contributeIndex >= 0) goToStepIndex(contributeIndex)
            return
          }
          goToStepIndex(tentativeNext)
          return
        }

        if (shouldResetToRootBeforeStep(nextStep.id)) {
          resetToRoot()
          expand()
        }

        setStepIndex(tentativeNext)
      } finally {
        navigatingRef.current = false
      }
    })()
  }, [
    stepIndex,
    endTour,
    prepareUpdateResourceStep,
    prepareMapDetailsStep,
    resetToRoot,
    expand,
    selectedResourceId,
    demoResourceId,
    openResourceDetail,
    goToStepIndex,
  ])

  const back = useCallback(() => {
    if (navigatingRef.current) return
    if (isFirstTourStep(stepIndex)) return

    const current = DISCOVER_TOUR_STEPS[stepIndex]
    const tentativePrev = stepIndex - 1
    const prevStep = DISCOVER_TOUR_STEPS[tentativePrev]
    if (!prevStep) return

    void (async () => {
      navigatingRef.current = true
      try {
        // Step 4 → Step 3: return to results for another selection.
        if (current?.id === 'details' && prevStep.id === 'results') {
          autoAdvanceGuardRef.current = null
          resetToRoot()
          expand()
          goToStepIndex(tentativePrev)
          return
        }

        // Step 5 → Step 4: reopen the results-selected Resource Detail.
        if (current?.id === 'explore-map' && prevStep.id === 'details') {
          const resourceId =
            resultsResourceId ?? demoResourceId ?? pickFirstTourResourceId()
          if (!resourceId) {
            goToStepIndex(getTourStepIndexById('results'))
            resetToRoot()
            expand()
            return
          }
          const ready = await openDemoResourceDetail(resourceId, {
            scrollToUpdate: false,
          })
          if (!ready) {
            resetToRoot()
            expand()
            goToStepIndex(getTourStepIndexById('results'))
            return
          }
          goToStepIndex(tentativePrev)
          return
        }

        // Step 6 → Step 5: close detail, show map again.
        if (current?.id === 'map-details' && prevStep.id === 'explore-map') {
          autoAdvanceGuardRef.current = null
          resetToRoot()
          expand()
          goToStepIndex(tentativePrev)
          return
        }

        // Step 7 → Step 6: same resource, scroll detail back to top.
        if (
          current?.id === 'update-resource' &&
          prevStep.id === 'map-details'
        ) {
          const resourceId =
            mapResourceId ?? demoResourceId ?? pickFirstTourResourceId()
          if (!resourceId) {
            autoAdvanceGuardRef.current = null
            resetToRoot()
            expand()
            goToStepIndex(getTourStepIndexById('explore-map'))
            return
          }
          const ready = await openDemoResourceDetail(resourceId, {
            scrollToUpdate: false,
          })
          if (!ready) {
            autoAdvanceGuardRef.current = null
            resetToRoot()
            expand()
            goToStepIndex(getTourStepIndexById('explore-map'))
            return
          }
          goToStepIndex(tentativePrev)
          return
        }

        // Step 8 → Step 7: restore resource + Update Resource spotlight.
        if (
          current?.id === 'contribute' &&
          requiresResourceDetailStep(prevStep.id)
        ) {
          const resourceId =
            mapResourceId ?? demoResourceId ?? pickFirstTourResourceId()
          if (!resourceId) {
            const mapIndex = getTourStepIndexById('explore-map')
            resetToRoot()
            expand()
            goToStepIndex(mapIndex >= 0 ? mapIndex : tentativePrev - 1)
            return
          }
          const ready = await openDemoResourceDetail(resourceId, {
            scrollToUpdate: true,
          })
          if (!ready) {
            const mapIndex = getTourStepIndexById('explore-map')
            resetToRoot()
            expand()
            goToStepIndex(mapIndex >= 0 ? mapIndex : tentativePrev - 1)
            return
          }
          goToStepIndex(tentativePrev)
          return
        }

        if (shouldResetToRootBeforeStep(prevStep.id)) {
          resetToRoot()
          expand()
        }

        setStepIndex(tentativePrev)
      } finally {
        navigatingRef.current = false
      }
    })()
  }, [
    stepIndex,
    demoResourceId,
    resultsResourceId,
    mapResourceId,
    openDemoResourceDetail,
    resetToRoot,
    expand,
    goToStepIndex,
  ])

  const skip = useCallback(() => {
    endTour()
  }, [endTour])

  const finish = useCallback(() => {
    endTour()
  }, [endTour])

  const value = useMemo(
    () => ({
      isActive,
      stepIndex,
      step,
      stepCount: DISCOVER_TOUR_STEP_COUNT,
      isFirstStep: isFirstTourStep(stepIndex),
      isLastStep: isLastTourStep(stepIndex),
      demoResourceId,
      startTour,
      next,
      back,
      skip,
      finish,
    }),
    [
      isActive,
      stepIndex,
      step,
      demoResourceId,
      startTour,
      next,
      back,
      skip,
      finish,
    ],
  )

  return (
    <DiscoverTourContext.Provider value={value}>
      {children}
    </DiscoverTourContext.Provider>
  )
}

export function useDiscoverTour() {
  const context = useContext(DiscoverTourContext)
  if (!context) {
    throw new Error('useDiscoverTour must be used within DiscoverTourProvider')
  }
  return context
}
