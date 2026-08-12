/**
 * Mobile Discover bottom-sheet height fractions (fraction of map area height).
 * Shared with selection camera padding so the map accounts for sheet coverage.
 */
export const MOBILE_DISCOVER_SHEET_HEIGHT = {
  collapsed: 0.18,
  mid: 0.55,
  expanded: 0.88,
} as const

/** Extra pixels above the sheet top so the pin is not flush against the sheet edge. */
export const MOBILE_SHEET_BOTTOM_COMFORT_PX = 28

/** Minimum visible map strip when applying detail-sheet inset (avoids over-padding). */
export const MOBILE_MIN_VISIBLE_MAP_PX = 64

/**
 * Bottom padding (px) for selection camera on mobile — sheet coverage plus comfort.
 */
export function resolveMobileSheetBottomInsetPx(
  mapHeightPx: number,
  sheetHeightFraction: number,
  comfortPx = MOBILE_SHEET_BOTTOM_COMFORT_PX,
): number {
  if (mapHeightPx <= 0) return 0
  const sheetPx = Math.round(mapHeightPx * sheetHeightFraction)
  const inset = sheetPx + comfortPx
  const maxInset = mapHeightPx - MOBILE_MIN_VISIBLE_MAP_PX
  return Math.max(0, Math.min(inset, maxInset))
}
