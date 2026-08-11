export type TourCardPlacement =
  | 'below'
  | 'above'
  | 'right'
  | 'left'
  | 'beside-panel'
  | 'over-panel'
  | 'map'

export interface RectLike {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

export interface TourCardPosition {
  top: number
  left: number
  placement: TourCardPlacement
}

/** Desktop coachmark max width — compact floating guide card. */
export const TOUR_CARD_MAX_WIDTH_PX = 380

const VIEWPORT_MARGIN = 12
const GAP = 12
/** Horizontal gap between workspace right edge and coachmark (Mode A). */
export const COACHMARK_PANEL_GAP_PX = 24
/** Clear Leaflet zoom controls on the leading edge of the map. */
export const MAP_CONTROL_CLEARANCE_PX = 56

/**
 * Minimum free width to the right of the workspace for Mode A docking.
 * Card + panel gap + viewport margin.
 */
export function panelSideMinWidthPx(cardWidth: number): number {
  return cardWidth + COACHMARK_PANEL_GAP_PX + VIEWPORT_MARGIN
}

export function hasSufficientPanelSideSpace(args: {
  workspaceRight: number
  cardWidth: number
  viewportWidth: number
}): boolean {
  const available = args.viewportWidth - args.workspaceRight - VIEWPORT_MARGIN
  return available >= args.cardWidth + COACHMARK_PANEL_GAP_PX
}

/** @deprecated Prefer hasSufficientPanelSideSpace — kept for older call sites. */
export function hasSufficientMapSideSpace(args: {
  mapRegionWidth: number
  cardWidth: number
}): boolean {
  return args.mapRegionWidth >= panelSideMinWidthPx(args.cardWidth)
}

/**
 * Place the tour coachmark.
 *
 * Mode A (panel-target steps, desktop): dock immediately beside the workspace
 * right edge. Vertical position tracks the spotlight target.
 *
 * Mode B (explore-map): handled via placeExploreMapTourLayout.
 *
 * Narrow layouts: fall back to target-aware above/below placement.
 */
export function placeTourCard(args: {
  target: RectLike | null
  cardWidth: number
  cardHeight: number
  viewportWidth: number
  viewportHeight: number
  /** Discover / resource workspace panel bounds. */
  workspace?: RectLike | null
  /** Visible map canvas bounds (used as workspace fallback). */
  mapRegion?: RectLike | null
}): TourCardPosition {
  const {
    target,
    cardWidth,
    cardHeight,
    viewportWidth,
    viewportHeight,
    workspace = null,
    mapRegion = null,
  } = args

  const panel = workspace ?? inferWorkspaceFromMap(mapRegion)

  if (
    panel &&
    hasSufficientPanelSideSpace({
      workspaceRight: panel.right,
      cardWidth,
      viewportWidth,
    })
  ) {
    return placeTourCardBesideWorkspace({
      workspace: panel,
      target,
      cardWidth,
      cardHeight,
      viewportWidth,
      viewportHeight,
    })
  }

  if (!target) {
    return centerTourCard({
      cardWidth,
      cardHeight,
      viewportWidth,
      viewportHeight,
    })
  }

  return placeAdjacentToTarget({
    target,
    cardWidth,
    cardHeight,
    viewportWidth,
    viewportHeight,
  })
}

/**
 * Mode A — dock coachmark just to the right of the Discover workspace.
 * Horizontal: workspace.right + gap (never from target centre).
 * Vertical: align with target when available, else panel/viewport centre.
 */
export function placeTourCardBesideWorkspace(args: {
  workspace: RectLike
  target: RectLike | null
  cardWidth: number
  cardHeight: number
  viewportWidth: number
  viewportHeight: number
  gapPx?: number
}): TourCardPosition {
  const {
    workspace,
    target,
    cardWidth,
    cardHeight,
    viewportWidth,
    viewportHeight,
    gapPx = COACHMARK_PANEL_GAP_PX,
  } = args

  const idealLeft = workspace.right + gapPx
  const idealTop = target
    ? target.top + target.height / 2 - cardHeight / 2
    : workspace.top + workspace.height / 2 - cardHeight / 2

  const clamped = clampToViewport(
    idealTop,
    idealLeft,
    cardWidth,
    cardHeight,
    viewportWidth,
    viewportHeight,
  )

  // Never drift left over the workspace.
  const left = Math.max(clamped.left, workspace.right + gapPx)

  return {
    top: clamped.top,
    left: Math.min(left, viewportWidth - cardWidth - VIEWPORT_MARGIN),
    placement: 'beside-panel',
  }
}

/**
 * Mode B — sit the coachmark over the Discover workspace so the full map
 * stays clear. Width should already be constrained to fit the panel.
 */
export function placeTourCardOverWorkspace(args: {
  workspace: RectLike
  cardWidth: number
  cardHeight: number
  viewportWidth: number
  viewportHeight: number
}): TourCardPosition {
  const { workspace, cardWidth, cardHeight, viewportWidth, viewportHeight } =
    args

  const inset = 16
  const idealLeft = workspace.left + (workspace.width - cardWidth) / 2
  // Prefer upper-middle of the panel so copy reads near eye level.
  const idealTop = workspace.top + Math.max(inset, workspace.height * 0.18)

  const clamped = clampToViewport(
    idealTop,
    idealLeft,
    cardWidth,
    cardHeight,
    viewportWidth,
    viewportHeight,
  )

  // Prefer staying left of the map edge so the full map stays clear.
  const maxLeft = Math.max(
    workspace.left + inset,
    workspace.right - cardWidth - inset,
  )
  const minLeft = workspace.left + inset
  const left = Math.min(Math.max(clamped.left, minLeft), maxLeft)

  return {
    top: clamped.top,
    left: Math.max(VIEWPORT_MARGIN, left),
    placement: 'over-panel',
  }
}

/**
 * Explore-map layout: full map canvas spotlight + coachmark over workspace.
 */
export function placeExploreMapTourLayout(args: {
  mapRegion: RectLike
  workspace: RectLike
  cardWidth: number
  cardHeight: number
  viewportWidth: number
  viewportHeight: number
}): { spotlight: RectLike; card: TourCardPosition; cardWidth: number } {
  const {
    mapRegion,
    workspace,
    cardWidth,
    cardHeight,
    viewportWidth,
    viewportHeight,
  } = args

  // Fit the card inside the workspace so it does not cover the map.
  const overlayCardWidth = Math.min(
    cardWidth,
    Math.max(200, workspace.width - 32),
  )

  const card = placeTourCardOverWorkspace({
    workspace,
    cardWidth: overlayCardWidth,
    cardHeight,
    viewportWidth,
    viewportHeight,
  })

  return {
    card,
    cardWidth: overlayCardWidth,
    spotlight: { ...mapRegion },
  }
}

/**
 * @deprecated Prefer placeTourCardBesideWorkspace — kept for older tests.
 * Parks the card in the map region (legacy centred map placement).
 */
export function placeTourCardInMapRegion(args: {
  mapRegion: RectLike
  cardWidth: number
  cardHeight: number
  viewportWidth: number
  viewportHeight: number
  horizontalAlign?: 'center' | 'end'
}): TourCardPosition {
  const {
    mapRegion,
    cardWidth,
    cardHeight,
    viewportWidth,
    viewportHeight,
    horizontalAlign = 'center',
  } = args

  const usableLeft = mapRegion.left + MAP_CONTROL_CLEARANCE_PX
  const usableRight = Math.min(
    mapRegion.right - VIEWPORT_MARGIN,
    viewportWidth - VIEWPORT_MARGIN,
  )
  const usableWidth = Math.max(cardWidth, usableRight - usableLeft)
  const idealLeft =
    horizontalAlign === 'end'
      ? usableRight - cardWidth
      : usableLeft + (usableWidth - cardWidth) / 2
  const idealTop = (viewportHeight - cardHeight) / 2

  const clamped = clampToViewport(
    idealTop,
    idealLeft,
    cardWidth,
    cardHeight,
    viewportWidth,
    viewportHeight,
  )

  const minLeft = Math.min(
    usableLeft,
    viewportWidth - cardWidth - VIEWPORT_MARGIN,
  )
  const left = Math.max(clamped.left, Math.max(minLeft, mapRegion.left + GAP))

  return {
    top: clamped.top,
    left: Math.min(left, viewportWidth - cardWidth - VIEWPORT_MARGIN),
    placement: 'map',
  }
}

/** @deprecated Prefer placeTourCard with workspace — kept for older tests. */
export function tryOpenSidePlacement(args: {
  target: RectLike
  cardWidth: number
  cardHeight: number
  viewportWidth: number
  viewportHeight: number
}): TourCardPosition | null {
  const workspace = {
    top: 0,
    left: 0,
    right: args.target.right,
    bottom: args.viewportHeight,
    width: args.target.right,
    height: args.viewportHeight,
  }
  if (
    !hasSufficientPanelSideSpace({
      workspaceRight: workspace.right,
      cardWidth: args.cardWidth,
      viewportWidth: args.viewportWidth,
    })
  ) {
    return null
  }
  return placeTourCardBesideWorkspace({
    workspace,
    target: args.target,
    cardWidth: args.cardWidth,
    cardHeight: args.cardHeight,
    viewportWidth: args.viewportWidth,
    viewportHeight: args.viewportHeight,
  })
}

function inferWorkspaceFromMap(mapRegion: RectLike | null): RectLike | null {
  if (!mapRegion || mapRegion.left <= 0) return null
  return {
    top: mapRegion.top,
    left: 0,
    right: mapRegion.left,
    bottom: mapRegion.bottom,
    width: mapRegion.left,
    height: mapRegion.height,
  }
}

function placeAdjacentToTarget(args: {
  target: RectLike
  cardWidth: number
  cardHeight: number
  viewportWidth: number
  viewportHeight: number
}): TourCardPosition {
  const { target, cardWidth, cardHeight, viewportWidth, viewportHeight } = args

  const candidates: Array<{
    placement: TourCardPlacement
    top: number
    left: number
  }> = [
    {
      placement: 'below',
      top: target.bottom + GAP,
      left: target.left + target.width / 2 - cardWidth / 2,
    },
    {
      placement: 'above',
      top: target.top - GAP - cardHeight,
      left: target.left + target.width / 2 - cardWidth / 2,
    },
    {
      placement: 'right',
      top: target.top + target.height / 2 - cardHeight / 2,
      left: target.right + GAP,
    },
    {
      placement: 'left',
      top: target.top + target.height / 2 - cardHeight / 2,
      left: target.left - GAP - cardWidth,
    },
  ]

  const scored = candidates.map((candidate, orderIndex) => {
    const clamped = clampToViewport(
      candidate.top,
      candidate.left,
      cardWidth,
      cardHeight,
      viewportWidth,
      viewportHeight,
    )
    const card = rectFromPosition(
      clamped.top,
      clamped.left,
      cardWidth,
      cardHeight,
    )
    const overflow =
      Math.abs(clamped.top - candidate.top) +
      Math.abs(clamped.left - candidate.left)
    const overlap = overlapArea(card, target)
    const score = overlap * 10_000 + overflow * 10 + orderIndex * 0.01
    return { ...candidate, ...clamped, overlap, overflow, score }
  })

  scored.sort((a, b) => a.score - b.score)
  const best = scored[0]

  return {
    top: best.top,
    left: best.left,
    placement: best.placement,
  }
}

export function rectFromPosition(
  top: number,
  left: number,
  width: number,
  height: number,
): RectLike {
  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
  }
}

export function rectsOverlap(a: RectLike, b: RectLike): boolean {
  return overlapArea(a, b) > 0
}

export function overlapArea(a: RectLike, b: RectLike): number {
  const width = Math.max(
    0,
    Math.min(a.right, b.right) - Math.max(a.left, b.left),
  )
  const height = Math.max(
    0,
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  )
  return width * height
}

function clampToViewport(
  top: number,
  left: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
): { top: number; left: number } {
  const maxLeft = Math.max(
    VIEWPORT_MARGIN,
    viewportWidth - width - VIEWPORT_MARGIN,
  )
  const maxTop = Math.max(
    VIEWPORT_MARGIN,
    viewportHeight - height - VIEWPORT_MARGIN,
  )
  return {
    top: Math.min(Math.max(top, VIEWPORT_MARGIN), maxTop),
    left: Math.min(Math.max(left, VIEWPORT_MARGIN), maxLeft),
  }
}

/** Centered fallback when no target/workspace rect is available. */
export function centerTourCard(args: {
  cardWidth: number
  cardHeight: number
  viewportWidth: number
  viewportHeight: number
}): TourCardPosition {
  return {
    placement: 'below',
    top: Math.max(VIEWPORT_MARGIN, (args.viewportHeight - args.cardHeight) / 2),
    left: Math.max(VIEWPORT_MARGIN, (args.viewportWidth - args.cardWidth) / 2),
  }
}

export function padHighlightRect(rect: RectLike, padding = 6): RectLike {
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
    right: rect.right + padding,
    bottom: rect.bottom + padding,
  }
}
