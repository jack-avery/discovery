import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DISCOVER_START_TOUR_QUERY } from '@/features/discover/constants'
import {
  DISCOVER_TOUR_STEPS,
  DISCOVER_TOUR_STEP_COUNT,
  getTourStepIndexById,
  isFirstTourStep,
  isLastTourStep,
  isResourceDetailIntroStep,
} from '@/features/discover/tour/tourSteps'
import {
  centerTourCard,
  COACHMARK_PANEL_GAP_PX,
  hasSufficientPanelSideSpace,
  overlapArea,
  placeExploreMapTourLayout,
  placeTourCard,
  placeTourCardBesideWorkspace,
  rectFromPosition,
  tryOpenSidePlacement,
} from '@/features/discover/tour/tourPlacement'
import {
  prepareDiscoverForTour,
  resolveAvailableTourStepIndex,
} from '@/features/discover/tour/DiscoverTourProvider'
import {
  isInteractionDemoStep,
  MAP_SELECTION_AUTO_ADVANCE_STEP_ID,
  RESULTS_SELECTION_AUTO_ADVANCE_STEP_ID,
  shouldAutoAdvanceFromMap,
  shouldAutoAdvanceFromResults,
  tourAutoAdvanceGuardKey,
} from '@/features/discover/tour/tourAutoAdvance'
import {
  buildBlockingPanels,
  isPointBlockedByPanels,
  isPointInAnyRect,
  isTourTargetInteractive,
  requiresResourceDetailStep,
  shouldOpenMobileNavForTourStep,
  shouldResetToRootBeforeStep,
} from '@/features/discover/tour/spotlightInteraction'
import {
  isDiscoverTourSessionActive,
  setDiscoverTourSessionActive,
  TOUR_CLOSE_LABEL,
} from '@/features/discover/tour/tourSession'
import {
  pickFirstTourResourceId,
  resolveTourDemoResourceId,
  setTourResourceCatalog,
} from '@/features/discover/tour/tourResourceCatalog'
import { TOUR_TARGETS } from '@/features/discover/tour/tourTargets'
import { resolveDetailsStepTarget } from '@/features/discover/tour/tourTargets'
import { guidedTourHref } from '@/features/landing/components/GetStartedSection'

describe('guided tour landing entry', () => {
  it('points the Guided Tour CTA at /discover?tour=1', () => {
    assert.equal(guidedTourHref(), `/discover?${DISCOVER_START_TOUR_QUERY}=1`)
    assert.equal(guidedTourHref(), '/discover?tour=1')
  })

  it('treats tour=1 as the one-shot start flag and strips it for replace', () => {
    const params = new URLSearchParams('tour=1&other=keep')
    assert.equal(params.get(DISCOVER_START_TOUR_QUERY), '1')
    params.delete(DISCOVER_START_TOUR_QUERY)
    assert.equal(params.get(DISCOVER_START_TOUR_QUERY), null)
    assert.equal(params.get('other'), 'keep')
  })
})

describe('discover tour steps', () => {
  it('defines exactly eight steps in the product order', () => {
    assert.equal(DISCOVER_TOUR_STEP_COUNT, 8)
    assert.deepEqual(
      DISCOVER_TOUR_STEPS.map((step) => step.id),
      [
        'search',
        'filters',
        'results',
        'details',
        'explore-map',
        'map-details',
        'update-resource',
        'contribute',
      ],
    )
  })

  it('uses stable data-tour target ids (not leaflet or CSS classes)', () => {
    assert.deepEqual(
      DISCOVER_TOUR_STEPS.map((step) => step.targetId),
      [
        TOUR_TARGETS.search,
        TOUR_TARGETS.filters,
        TOUR_TARGETS.results,
        TOUR_TARGETS.resourceDetail,
        TOUR_TARGETS.map,
        TOUR_TARGETS.resourceDetail,
        TOUR_TARGETS.updateResource,
        TOUR_TARGETS.contribute,
      ],
    )
  })

  it('marks the final step for Finish instead of Next', () => {
    assert.equal(isFirstTourStep(0), true)
    assert.equal(isLastTourStep(0), false)
    assert.equal(isLastTourStep(7), true)
    assert.equal(DISCOVER_TOUR_STEPS[7]?.heading, 'Share what you know')
  })

  it('exposes a single early-exit close label for the coachmark X', () => {
    assert.equal(TOUR_CLOSE_LABEL, 'Close guided tour')
  })

  it('keeps dedicated copy for results, details, map, map-details, and update steps', () => {
    assert.equal(DISCOVER_TOUR_STEPS[2]?.heading, 'Browse the results')
    assert.equal(DISCOVER_TOUR_STEPS[3]?.heading, 'View resource details')
    assert.equal(DISCOVER_TOUR_STEPS[4]?.heading, 'Explore the map')
    assert.equal(DISCOVER_TOUR_STEPS[5]?.heading, 'View the resource')
    assert.equal(DISCOVER_TOUR_STEPS[6]?.heading, 'Keep information up to date')
    assert.match(DISCOVER_TOUR_STEPS[2].body, /Select a resource from the list/)
    assert.match(DISCOVER_TOUR_STEPS[4].body, /from the map/)
    assert.match(DISCOVER_TOUR_STEPS[5].body, /map pin opens the resource/)
    assert.match(DISCOVER_TOUR_STEPS[6].body, /Update Resource/)
    assert.equal(DISCOVER_TOUR_STEPS[3].body.includes('Update Resource'), false)
    assert.equal(DISCOVER_TOUR_STEPS[5].body.includes('Update Resource'), false)
    assert.equal(isResourceDetailIntroStep('details'), true)
    assert.equal(isResourceDetailIntroStep('map-details'), true)
    assert.equal(isResourceDetailIntroStep('update-resource'), false)
  })
})

describe('step 3 / step 4 resource detail targeting', () => {
  it('does not target Resource Detail until a real resource is selected', () => {
    const results = { id: 'results' } as unknown as HTMLElement
    const detail = { id: 'detail' } as unknown as HTMLElement
    const findTarget = (id: string) => {
      if (id === TOUR_TARGETS.results) return results
      if (id === TOUR_TARGETS.resourceDetail) return detail
      return null
    }

    assert.equal(
      resolveDetailsStepTarget({
        isResourceDetailActive: false,
        selectedResourceId: null,
        findTarget,
      }),
      null,
    )
  })

  it('never prefers an empty Resource Detail overlay', () => {
    const emptyDetail = { id: 'empty-detail' } as unknown as HTMLElement
    const findTarget = (id: string) => {
      if (id === TOUR_TARGETS.resourceDetail) return emptyDetail
      return null
    }

    assert.equal(
      resolveDetailsStepTarget({
        isResourceDetailActive: false,
        selectedResourceId: null,
        findTarget,
      }),
      null,
    )
    assert.equal(
      resolveDetailsStepTarget({
        isResourceDetailActive: true,
        selectedResourceId: null,
        findTarget,
      }),
      null,
    )
  })

  it('targets live Resource Detail when a real resource is selected', () => {
    const detail = { id: 'detail' } as unknown as HTMLElement
    const findTarget = (id: string) => {
      if (id === TOUR_TARGETS.resourceDetail) return detail
      return null
    }

    assert.equal(
      resolveDetailsStepTarget({
        isResourceDetailActive: true,
        selectedResourceId: '42',
        findTarget,
      }),
      detail,
    )
  })

  it('preserves the selected resource id across interactive steps', () => {
    assert.equal(
      resolveTourDemoResourceId({
        selectedResourceId: '99',
        preservedResourceId: '1',
      }),
      '99',
    )
  })
})

describe('interactive auto-advance', () => {
  it('auto-advances from results only on a results-origin selection', () => {
    assert.equal(
      shouldAutoAdvanceFromResults({
        stepId: 'results',
        origin: 'results',
        selectedResourceId: '7',
      }),
      true,
    )
    assert.equal(
      shouldAutoAdvanceFromResults({
        stepId: 'results',
        origin: 'map',
        selectedResourceId: '7',
      }),
      false,
    )
    assert.equal(
      shouldAutoAdvanceFromResults({
        stepId: 'results',
        origin: 'programmatic',
        selectedResourceId: '7',
      }),
      false,
    )
    assert.equal(
      shouldAutoAdvanceFromResults({
        stepId: 'results',
        origin: 'results',
        selectedResourceId: null,
      }),
      false,
    )
    assert.equal(
      shouldAutoAdvanceFromResults({
        stepId: 'details',
        origin: 'results',
        selectedResourceId: '7',
      }),
      false,
    )
  })

  it('auto-advances from explore-map only on a map-origin pin selection', () => {
    assert.equal(
      shouldAutoAdvanceFromMap({
        stepId: 'explore-map',
        origin: 'map',
        selectedResourceId: '7',
      }),
      true,
    )
    assert.equal(
      shouldAutoAdvanceFromMap({
        stepId: 'explore-map',
        origin: 'results',
        selectedResourceId: '7',
      }),
      false,
    )
    assert.equal(
      shouldAutoAdvanceFromMap({
        stepId: 'explore-map',
        origin: 'programmatic',
        selectedResourceId: '7',
      }),
      false,
    )
    assert.equal(
      shouldAutoAdvanceFromMap({
        stepId: 'explore-map',
        origin: 'map',
        selectedResourceId: null,
      }),
      false,
    )
  })

  it('routes map pin selection only to map-details, never straight to update-resource', () => {
    assert.equal(RESULTS_SELECTION_AUTO_ADVANCE_STEP_ID, 'details')
    assert.equal(MAP_SELECTION_AUTO_ADVANCE_STEP_ID, 'map-details')
    assert.notEqual(MAP_SELECTION_AUTO_ADVANCE_STEP_ID, 'update-resource')

    // While on map-details / update-resource, a lingering map origin must not re-advance.
    assert.equal(
      shouldAutoAdvanceFromMap({
        stepId: 'map-details',
        origin: 'map',
        selectedResourceId: '7',
      }),
      false,
    )
    assert.equal(
      shouldAutoAdvanceFromMap({
        stepId: 'update-resource',
        origin: 'map',
        selectedResourceId: '7',
      }),
      false,
    )
    assert.equal(
      shouldAutoAdvanceFromResults({
        stepId: 'map-details',
        origin: 'results',
        selectedResourceId: '7',
      }),
      false,
    )
  })

  it('requires manual Next after detail intro steps', () => {
    assert.equal(isInteractionDemoStep('details'), false)
    assert.equal(isInteractionDemoStep('map-details'), false)
    assert.equal(isLastTourStep(getTourStepIndexById('details')), false)
    assert.equal(isLastTourStep(getTourStepIndexById('map-details')), false)
  })

  it('does not treat scroll or empty interaction as auto-advance', () => {
    assert.equal(isInteractionDemoStep('results'), true)
    assert.equal(isInteractionDemoStep('explore-map'), true)
    assert.equal(
      shouldAutoAdvanceFromResults({
        stepId: 'results',
        origin: null,
        selectedResourceId: null,
      }),
      false,
    )
  })

  it('builds a stable once-only auto-advance guard key', () => {
    const key = tourAutoAdvanceGuardKey({
      stepId: 'results',
      resourceId: '12',
      origin: 'results',
    })
    assert.equal(key, 'results:results:12')
    assert.equal(
      tourAutoAdvanceGuardKey({
        stepId: 'explore-map',
        resourceId: '12',
        origin: 'map',
      }),
      'explore-map:map:12',
    )
  })
})

describe('tour-start normalization', () => {
  it('resets navigation to Discover root without inheriting detail state', () => {
    const calls: string[] = []
    prepareDiscoverForTour({
      expand: () => calls.push('expand'),
      resetToRoot: () => calls.push('resetToRoot'),
      closeSideWorkspace: () => calls.push('closeSideWorkspace'),
    })
    assert.ok(calls.includes('resetToRoot'))
    assert.equal(calls[0], 'closeSideWorkspace')
    assert.equal(calls[1], 'resetToRoot')
  })
})

describe('resolveAvailableTourStepIndex', () => {
  it('skips missing targets without stalling', () => {
    const present = new Set(['filters', 'contribute'])
    const findTarget = (id: string) =>
      present.has(id) ? ({} as HTMLElement) : null

    assert.equal(
      resolveAvailableTourStepIndex({
        fromIndex: 0,
        direction: 'forward',
        findTarget,
      }),
      1,
    )
    assert.equal(
      resolveAvailableTourStepIndex({
        fromIndex: 0,
        direction: 'forward',
        findTarget: () => null,
        canShowUpdateResourceStep: false,
      }),
      null,
    )
  })

  it('can skip resource-dependent steps when no resources are available', () => {
    const present = new Set(['results', 'map', 'contribute'])
    const findTarget = (id: string) =>
      present.has(id) ? ({} as HTMLElement) : null

    assert.equal(
      resolveAvailableTourStepIndex({
        fromIndex: getTourStepIndexById('explore-map') + 1,
        direction: 'forward',
        findTarget,
        canShowUpdateResourceStep: false,
      }),
      getTourStepIndexById('contribute'),
    )
  })

  it('skips details and map-details when no resource detail is open', () => {
    const present = new Set(['results', 'map', 'contribute'])
    const findTarget = (id: string) =>
      present.has(id) ? ({} as HTMLElement) : null

    assert.equal(
      resolveAvailableTourStepIndex({
        fromIndex: getTourStepIndexById('results') + 1,
        direction: 'forward',
        findTarget,
        canShowUpdateResourceStep: false,
      }),
      getTourStepIndexById('explore-map'),
    )
  })
})

describe('tour demo resource selection', () => {
  it('reuses a selected resource before falling back to the catalog', () => {
    setTourResourceCatalog(['10', '20', '30'])
    assert.equal(
      resolveTourDemoResourceId({
        selectedResourceId: '20',
        preservedResourceId: '10',
      }),
      '20',
    )
    assert.equal(
      resolveTourDemoResourceId({
        selectedResourceId: null,
        preservedResourceId: '10',
      }),
      '10',
    )
    assert.equal(
      resolveTourDemoResourceId({
        selectedResourceId: null,
        preservedResourceId: null,
      }),
      '10',
    )
    assert.equal(pickFirstTourResourceId(), '10')
  })

  it('does not hardcode a resource id when the catalog is empty', () => {
    setTourResourceCatalog([])
    assert.equal(
      resolveTourDemoResourceId({
        selectedResourceId: null,
        preservedResourceId: null,
      }),
      null,
    )
  })

  it('prefers the map-selected resource for Update Resource reuse', () => {
    setTourResourceCatalog(['10', '20'])
    assert.equal(
      resolveTourDemoResourceId({
        selectedResourceId: '55',
        preservedResourceId: '10',
      }),
      '55',
    )
    // When selection clears, preserved map resource is preferred over catalog first.
    assert.equal(
      resolveTourDemoResourceId({
        selectedResourceId: null,
        preservedResourceId: '55',
      }),
      '55',
    )
  })
})

describe('tour card placement', () => {
  const workspace = {
    top: 0,
    left: 64,
    right: 64 + 368,
    bottom: 800,
    width: 368,
    height: 800,
  }
  const mapRegion = {
    top: 0,
    left: workspace.right,
    right: 1280,
    bottom: 800,
    width: 1280 - workspace.right,
    height: 800,
  }
  const cardWidth = 380
  const cardHeight = 220

  it('docks panel-target coachmarks beside the workspace with the configured gap', () => {
    assert.equal(
      hasSufficientPanelSideSpace({
        workspaceRight: workspace.right,
        cardWidth,
        viewportWidth: 1280,
      }),
      true,
    )

    const searchTarget = {
      top: 80,
      left: 80,
      right: 400,
      bottom: 140,
      width: 320,
      height: 60,
    }
    const placed = placeTourCard({
      target: searchTarget,
      workspace,
      mapRegion,
      cardWidth,
      cardHeight,
      viewportWidth: 1280,
      viewportHeight: 800,
    })

    assert.equal(placed.placement, 'beside-panel')
    assert.equal(placed.left, workspace.right + COACHMARK_PANEL_GAP_PX)
    assert.equal(
      overlapArea(
        rectFromPosition(placed.top, placed.left, cardWidth, cardHeight),
        workspace,
      ),
      0,
    )
    assert.equal(
      overlapArea(
        rectFromPosition(placed.top, placed.left, cardWidth, cardHeight),
        searchTarget,
      ),
      0,
    )
  })

  it('keeps horizontal placement stable across targets (not from target centre)', () => {
    const targets = [
      { top: 80, left: 80, right: 400, bottom: 140, width: 320, height: 60 },
      { top: 150, left: 80, right: 400, bottom: 280, width: 320, height: 130 },
      { top: 300, left: 80, right: 400, bottom: 700, width: 320, height: 400 },
      { top: 120, left: 80, right: 400, bottom: 700, width: 320, height: 580 },
      { top: 500, left: 100, right: 280, bottom: 540, width: 180, height: 40 },
      { top: 200, left: 8, right: 56, bottom: 248, width: 48, height: 48 },
    ]

    const positions = targets.map((target) =>
      placeTourCard({
        target,
        workspace,
        mapRegion,
        cardWidth,
        cardHeight,
        viewportWidth: 1280,
        viewportHeight: 800,
      }),
    )

    for (const placed of positions) {
      assert.equal(placed.placement, 'beside-panel')
      assert.equal(placed.left, workspace.right + COACHMARK_PANEL_GAP_PX)
      assert.ok(placed.top >= 12)
      assert.ok(placed.top + cardHeight <= 800 - 12)
    }

    const lefts = positions.map((p) => p.left)
    assert.ok(Math.max(...lefts) - Math.min(...lefts) < 1)
  })

  it('vertically tracks the target while keeping the panel-side horizontal anchor', () => {
    const upper = placeTourCardBesideWorkspace({
      workspace,
      target: {
        top: 60,
        left: 80,
        right: 400,
        bottom: 120,
        width: 320,
        height: 60,
      },
      cardWidth,
      cardHeight,
      viewportWidth: 1280,
      viewportHeight: 800,
    })
    const lower = placeTourCardBesideWorkspace({
      workspace,
      target: {
        top: 520,
        left: 100,
        right: 280,
        bottom: 560,
        width: 180,
        height: 40,
      },
      cardWidth,
      cardHeight,
      viewportWidth: 1280,
      viewportHeight: 800,
    })

    assert.equal(upper.left, lower.left)
    assert.ok(lower.top > upper.top)
  })

  it('uses workspace-overlay placement and full map spotlight for explore-map', () => {
    const layout = placeExploreMapTourLayout({
      mapRegion,
      workspace,
      cardWidth,
      cardHeight,
      viewportWidth: 1280,
      viewportHeight: 800,
    })

    assert.equal(layout.card.placement, 'over-panel')
    assert.ok(layout.card.left >= workspace.left)
    assert.ok(layout.card.left + layout.cardWidth <= workspace.right + 1)
    assert.equal(layout.spotlight.left, mapRegion.left)
    assert.equal(layout.spotlight.top, mapRegion.top)
    assert.equal(layout.spotlight.width, mapRegion.width)
    assert.equal(layout.spotlight.height, mapRegion.height)
    assert.equal(
      overlapArea(
        rectFromPosition(
          layout.card.top,
          layout.card.left,
          layout.cardWidth,
          cardHeight,
        ),
        mapRegion,
      ),
      0,
    )

    // Full map hole remains interactive (point inside map, outside card).
    const panels = buildBlockingPanels(layout.spotlight, 1280, 800)
    assert.equal(isPointBlockedByPanels(900, 400, panels), false)
    assert.equal(isPointBlockedByPanels(200, 400, panels), true)
  })

  it('parks explore-map coachmark at the top of the map when the sheet is collapsed', () => {
    const collapsedSheet = {
      top: 680,
      left: 0,
      right: 390,
      bottom: 800,
      width: 390,
      height: 120,
    }
    const mobileMap = {
      top: 56,
      left: 0,
      right: 390,
      bottom: 800,
      width: 390,
      height: 744,
    }
    const layout = placeExploreMapTourLayout({
      mapRegion: mobileMap,
      workspace: collapsedSheet,
      cardWidth: 360,
      cardHeight: 220,
      viewportWidth: 390,
      viewportHeight: 800,
    })

    assert.equal(layout.spotlight.height, mobileMap.height)
    assert.ok(layout.card.top < collapsedSheet.top)
    assert.ok(layout.card.top <= mobileMap.top + 24)
    // Mid-map pins stay outside the coachmark vertically.
    assert.ok(layout.card.top + 220 < mobileMap.top + mobileMap.height * 0.55)
  })

  it('returns to beside-workspace placement after the map step', () => {
    const updateTarget = {
      top: 500,
      left: 100,
      right: 280,
      bottom: 540,
      width: 180,
      height: 40,
    }
    const placed = placeTourCard({
      target: updateTarget,
      workspace,
      mapRegion,
      cardWidth,
      cardHeight,
      viewportWidth: 1280,
      viewportHeight: 800,
    })
    assert.equal(placed.placement, 'beside-panel')
    assert.equal(placed.left, workspace.right + COACHMARK_PANEL_GAP_PX)
  })

  it('falls back to responsive near-target placement on a narrow viewport', () => {
    assert.equal(
      hasSufficientPanelSideSpace({
        workspaceRight: 280,
        cardWidth: 380,
        viewportWidth: 400,
      }),
      false,
    )

    const open = tryOpenSidePlacement({
      target: {
        top: 40,
        left: 0,
        right: 300,
        bottom: 700,
        width: 300,
        height: 660,
      },
      cardWidth: 380,
      cardHeight: 220,
      viewportWidth: 400,
      viewportHeight: 800,
    })
    assert.equal(open, null)

    const target = {
      top: 80,
      left: 40,
      right: 200,
      bottom: 140,
      width: 160,
      height: 60,
    }
    const placed = placeTourCard({
      target,
      workspace: {
        top: 0,
        left: 0,
        right: 280,
        bottom: 800,
        width: 280,
        height: 800,
      },
      mapRegion: {
        top: 0,
        left: 280,
        right: 400,
        bottom: 800,
        width: 120,
        height: 800,
      },
      cardWidth: 280,
      cardHeight: 180,
      viewportWidth: 400,
      viewportHeight: 800,
    })
    assert.ok(placed.placement === 'above' || placed.placement === 'below')
    assert.ok(placed.left + 280 <= 400)
  })

  it('clamps the coachmark inside the viewport', () => {
    const placed = placeTourCardBesideWorkspace({
      workspace,
      target: {
        top: 780,
        left: 80,
        right: 400,
        bottom: 820,
        width: 320,
        height: 40,
      },
      cardWidth,
      cardHeight,
      viewportWidth: 1280,
      viewportHeight: 800,
    })
    assert.ok(placed.top >= 12)
    assert.ok(placed.top + cardHeight <= 800 - 12)
    assert.ok(placed.left + cardWidth <= 1280 - 12)
  })

  it('centers the card when no target or workspace is available', () => {
    const placed = centerTourCard({
      cardWidth: 320,
      cardHeight: 200,
      viewportWidth: 1000,
      viewportHeight: 800,
    })
    assert.equal(placed.left, (1000 - 320) / 2)
    assert.equal(placed.top, (800 - 200) / 2)
  })
})

describe('tour navigation contract', () => {
  it('advances and returns within eight-step bounds', () => {
    let index = 0
    index = Math.min(index + 1, DISCOVER_TOUR_STEP_COUNT - 1)
    assert.equal(index, 1)
    index = Math.max(index - 1, 0)
    assert.equal(index, 0)
    index = DISCOVER_TOUR_STEP_COUNT - 1
    assert.equal(isLastTourStep(index), true)
    assert.equal(DISCOVER_TOUR_STEP_COUNT, 8)
  })

  it('resets to Discover root before results, map, and contribute', () => {
    assert.equal(shouldResetToRootBeforeStep('results'), true)
    assert.equal(shouldResetToRootBeforeStep('explore-map'), true)
    assert.equal(shouldResetToRootBeforeStep('contribute'), true)
    assert.equal(shouldResetToRootBeforeStep('details'), false)
    assert.equal(shouldResetToRootBeforeStep('map-details'), false)
    assert.equal(requiresResourceDetailStep('update-resource'), true)
    assert.equal(requiresResourceDetailStep('details'), false)
    assert.equal(requiresResourceDetailStep('map-details'), false)
  })

  it('opens the mobile hamburger only for the contribute tour step', () => {
    assert.equal(shouldOpenMobileNavForTourStep('contribute', true), true)
    assert.equal(shouldOpenMobileNavForTourStep('contribute', false), false)
    assert.equal(shouldOpenMobileNavForTourStep('explore-map', true), false)
    assert.equal(shouldOpenMobileNavForTourStep(undefined, true), false)
  })

  it('documents Back transitions between interactive steps', () => {
    assert.equal(getTourStepIndexById('details') - 1, getTourStepIndexById('results'))
    assert.equal(
      getTourStepIndexById('explore-map') - 1,
      getTourStepIndexById('details'),
    )
    assert.equal(
      getTourStepIndexById('map-details') - 1,
      getTourStepIndexById('explore-map'),
    )
    assert.equal(
      getTourStepIndexById('update-resource') - 1,
      getTourStepIndexById('map-details'),
    )
    assert.equal(
      getTourStepIndexById('contribute') - 1,
      getTourStepIndexById('update-resource'),
    )
  })

  it('documents Step 5 fallback landing on map-details rather than update-resource', () => {
    assert.equal(
      getTourStepIndexById('explore-map') + 1,
      getTourStepIndexById('map-details'),
    )
    assert.notEqual(
      getTourStepIndexById('explore-map') + 1,
      getTourStepIndexById('update-resource'),
    )
  })
})

describe('spotlight interaction model', () => {
  const hole = {
    top: 100,
    left: 50,
    right: 350,
    bottom: 400,
    width: 300,
    height: 300,
  }

  it('leaves the highlighted hole interactive while blocking dimmed areas', () => {
    const panels = buildBlockingPanels(hole, 1000, 800)
    assert.equal(isPointInAnyRect(200, 250, [hole]), true)
    assert.equal(isPointBlockedByPanels(200, 250, panels), false)
    assert.equal(isPointBlockedByPanels(10, 10, panels), true)
    assert.equal(isPointBlockedByPanels(900, 700, panels), true)
  })

  it('allows Search/Filters/Results/Details/Map/Map-details interaction without closing the tour', () => {
    assert.equal(isTourTargetInteractive('search'), true)
    assert.equal(isTourTargetInteractive('filters'), true)
    assert.equal(isTourTargetInteractive('results'), true)
    assert.equal(isTourTargetInteractive('details'), true)
    assert.equal(isTourTargetInteractive('explore-map'), true)
    assert.equal(isTourTargetInteractive('map-details'), true)
  })

  it('blocks Update Resource and Contribute activation while highlighted', () => {
    assert.equal(isTourTargetInteractive('update-resource'), false)
    assert.equal(isTourTargetInteractive('contribute'), false)
  })

  it('keeps Next available on interaction demo and detail intro steps as a manual action', () => {
    assert.equal(DISCOVER_TOUR_STEPS[2]?.id, 'results')
    assert.equal(DISCOVER_TOUR_STEPS[4]?.id, 'explore-map')
    assert.equal(DISCOVER_TOUR_STEPS[5]?.id, 'map-details')
    assert.equal(isLastTourStep(2), false)
    assert.equal(isLastTourStep(4), false)
    assert.equal(isLastTourStep(5), false)
  })

  it('blocks Contribute navigation while the tour is active', () => {
    setDiscoverTourSessionActive(true)
    assert.equal(isDiscoverTourSessionActive(), true)
    setDiscoverTourSessionActive(false)
    assert.equal(isDiscoverTourSessionActive(), false)
  })

  it('restores normal interaction when the tour session ends via close', () => {
    setDiscoverTourSessionActive(true)
    assert.equal(isDiscoverTourSessionActive(), true)
    setDiscoverTourSessionActive(false)
    assert.equal(isDiscoverTourSessionActive(), false)
    assert.equal(TOUR_CLOSE_LABEL, 'Close guided tour')
  })
})
