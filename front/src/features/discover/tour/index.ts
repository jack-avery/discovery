export { DiscoverTour } from './DiscoverTour'
export {
  DiscoverTourProvider,
  prepareDiscoverForTour,
  resolveAvailableTourStepIndex,
  useDiscoverTour,
} from './DiscoverTourProvider'
export {
  DISCOVER_TOUR_STEPS,
  DISCOVER_TOUR_STEP_COUNT,
  isFirstTourStep,
  isLastTourStep,
  isResourceDetailIntroStep,
} from './tourSteps'
export {
  centerTourCard,
  placeTourCard,
  placeTourCardBesideWorkspace,
  placeTourCardOverWorkspace,
  placeTourCardInMapRegion,
  placeExploreMapTourLayout,
  padHighlightRect,
  tryOpenSidePlacement,
  hasSufficientMapSideSpace,
  hasSufficientPanelSideSpace,
  COACHMARK_PANEL_GAP_PX,
  TOUR_CARD_MAX_WIDTH_PX,
  rectsOverlap,
  overlapArea,
  rectFromPosition,
} from './tourPlacement'
export {
  buildBlockingPanels,
  isTourTargetInteractive,
  shouldResetToRootBeforeStep,
  requiresResourceDetailStep,
  isPointInAnyRect,
  isPointBlockedByPanels,
  expandTargetRectWithContainedOverlays,
} from './spotlightInteraction'
export {
  isDiscoverTourSessionActive,
  setDiscoverTourSessionActive,
  TOUR_CLOSE_LABEL,
} from './tourSession'
export {
  setTourResourceCatalog,
  getTourResourceCatalog,
  pickFirstTourResourceId,
  resolveTourDemoResourceId,
} from './tourResourceCatalog'
export {
  waitForTourTarget,
  scrollTourTargetIntoDetailView,
  scrollResourceDetailToTop,
} from './tourDom'
export {
  shouldAutoAdvanceFromResults,
  shouldAutoAdvanceFromMap,
  isInteractionDemoStep,
  tourAutoAdvanceGuardKey,
  MAP_SELECTION_AUTO_ADVANCE_STEP_ID,
  RESULTS_SELECTION_AUTO_ADVANCE_STEP_ID,
} from './tourAutoAdvance'
export { TOUR_TARGETS, TOUR_TARGET_ATTR, findTourTarget, resolveDetailsStepTarget, isTourTargetUsable } from './tourTargets'
