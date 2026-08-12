import type { RectLike } from '@/features/discover/tour/tourPlacement'
import { padHighlightRect, rectFromPosition } from '@/features/discover/tour/tourPlacement'

export interface BlockingPanel {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Four viewport panels that surround a rectangular hole so dimmed areas
 * capture pointer events while the hole lets clicks through to the page.
 */
export function buildBlockingPanels(
  hole: RectLike,
  viewportWidth: number,
  viewportHeight: number,
): BlockingPanel[] {
  const top = Math.max(0, hole.top)
  const left = Math.max(0, hole.left)
  const right = Math.min(viewportWidth, hole.right)
  const bottom = Math.min(viewportHeight, hole.bottom)
  const height = Math.max(0, bottom - top)

  const panels: BlockingPanel[] = []

  if (top > 0) {
    panels.push({ top: 0, left: 0, width: viewportWidth, height: top })
  }
  if (bottom < viewportHeight) {
    panels.push({
      top: bottom,
      left: 0,
      width: viewportWidth,
      height: viewportHeight - bottom,
    })
  }
  if (height > 0 && left > 0) {
    panels.push({ top, left: 0, width: left, height })
  }
  if (height > 0 && right < viewportWidth) {
    panels.push({
      top,
      left: right,
      width: viewportWidth - right,
      height,
    })
  }

  return panels.filter((panel) => panel.width > 0 && panel.height > 0)
}

/**
 * Build blocking panels for one or more interactive holes by punching each
 * hole out of a full-viewport mask (approximate via successive union of
 * non-overlapping strips around the primary hole, plus additional holes
 * cleared by not covering them — multi-hole uses the primary hole panels
 * and relies on additional transparent cutouts stacked above the blockers).
 *
 * For multiple holes, return panels for the union bounding box of all holes
 * only when they form one region; otherwise callers should render one set of
 * panels per hole with `pointer-events: none` cutout layers.
 */
export function unionRects(rects: readonly RectLike[]): RectLike | null {
  if (rects.length === 0) return null
  let top = Infinity
  let left = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const rect of rects) {
    top = Math.min(top, rect.top)
    left = Math.min(left, rect.left)
    right = Math.max(right, rect.right)
    bottom = Math.max(bottom, rect.bottom)
  }
  return rectFromPosition(top, left, right - left, bottom - top)
}

export function rectFromDomRect(rect: DOMRectReadOnly): RectLike {
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  }
}

/**
 * Expand a tour target rect to include open non-portaled overlays inside it
 * (e.g. FilterPopover listbox), so spotlight interaction reaches the menu.
 */
export function expandTargetRectWithContainedOverlays(
  target: HTMLElement,
): RectLike {
  const base = rectFromDomRect(target.getBoundingClientRect())
  const overlays = target.querySelectorAll<HTMLElement>(
    '[role="listbox"], [role="menu"], [data-tour-overlay]',
  )
  if (overlays.length === 0) return padHighlightRect(base)

  const rects: RectLike[] = [base]
  overlays.forEach((overlay) => {
    const rect = overlay.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      rects.push(rectFromDomRect(rect))
    }
  })
  const united = unionRects(rects)
  return padHighlightRect(united ?? base)
}

/** Highlighted but not activatable during the tour (Update Resource, Contribute). */
export function isTourTargetInteractive(stepId: string): boolean {
  return stepId !== 'contribute' && stepId !== 'update-resource'
}

/** Steps that must show Discover root (results list) before entering. */
export function shouldResetToRootBeforeStep(stepId: string): boolean {
  return (
    stepId === 'contribute' ||
    stepId === 'results' ||
    stepId === 'explore-map'
  )
}

/**
 * Mobile-only: open the hamburger menu so the real Contribute Resource item
 * is available as the `contribute` tour target.
 */
export function shouldOpenMobileNavForTourStep(
  stepId: string | undefined,
  isMobile: boolean,
): boolean {
  return isMobile && stepId === 'contribute'
}

/** Update Resource step needs an open Resource Detail panel first. */
export function requiresResourceDetailStep(stepId: string): boolean {
  return stepId === 'update-resource'
}

/**
 * Whether a point (viewport coords) lies inside any interactive hole.
 * Used by tests to document the interaction contract.
 */
export function isPointInAnyRect(
  x: number,
  y: number,
  rects: readonly RectLike[],
): boolean {
  return rects.some(
    (rect) =>
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom,
  )
}

/**
 * Whether a point falls on a blocking panel (dimmed / non-interactive).
 */
export function isPointBlockedByPanels(
  x: number,
  y: number,
  panels: readonly BlockingPanel[],
): boolean {
  return panels.some(
    (panel) =>
      x >= panel.left &&
      x <= panel.left + panel.width &&
      y >= panel.top &&
      y <= panel.top + panel.height,
  )
}
