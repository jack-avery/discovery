import type { MapBehaviourConfig } from '@/features/map/config/mapBehaviour'
import {
  MOBILE_DISCOVER_SHEET_HEIGHT,
  resolveMobileSheetBottomInsetPx,
} from '@/features/discover/mobileDiscoverSheet'

export interface SelectionPadding {
  topLeft: readonly [number, number]
  bottomRight: readonly [number, number]
}

/**
 * Leaflet padding for placing the selected resource in the usable map area.
 * Desktop values are unchanged; mobile detail uses the expanded sheet fraction.
 */
export function resolveSelectionPadding(args: {
  isMobile: boolean
  isExpanded: boolean
  mapHeightPx: number
  selection: MapBehaviourConfig['selection']
  /** Mobile resource-detail sheet is open — use expanded sheet coverage. */
  showingResourceDetail?: boolean
}): SelectionPadding {
  const {
    isMobile,
    isExpanded,
    mapHeightPx,
    selection,
    showingResourceDetail = false,
  } = args

  if (isMobile) {
    const sheetFraction = showingResourceDetail
      ? MOBILE_DISCOVER_SHEET_HEIGHT.expanded
      : selection.paddingMobile.bottomInsetFraction
    const bottom = resolveMobileSheetBottomInsetPx(mapHeightPx, sheetFraction)
    return {
      topLeft: selection.paddingMobile.topLeft,
      bottomRight: [selection.paddingMobile.bottomRightX, bottom] as const,
    }
  }

  return isExpanded ? selection.paddingExpanded : selection.paddingCollapsed
}
