import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MAP_BEHAVIOUR } from '@/features/map/config/mapBehaviour'
import {
  MOBILE_DISCOVER_SHEET_HEIGHT,
  MOBILE_SHEET_BOTTOM_COMFORT_PX,
  resolveMobileSheetBottomInsetPx,
} from '@/features/discover/mobileDiscoverSheet'
import { resolveSelectionPadding } from '@/features/map/selectionPadding'

const selection = MAP_BEHAVIOUR.selection

describe('resolveMobileSheetBottomInsetPx', () => {
  it('scales with viewport height and sheet fraction', () => {
    const inset800 = resolveMobileSheetBottomInsetPx(
      800,
      MOBILE_DISCOVER_SHEET_HEIGHT.expanded,
    )
    const inset360 = resolveMobileSheetBottomInsetPx(
      360,
      MOBILE_DISCOVER_SHEET_HEIGHT.expanded,
    )
    assert.equal(
      inset800,
      Math.round(800 * 0.88) + MOBILE_SHEET_BOTTOM_COMFORT_PX,
    )
    assert.equal(inset360, 360 - 64)
    assert.ok(inset800 > inset360)
  })

  it('adds comfort space above the sheet edge', () => {
    const withoutComfort = Math.round(844 * MOBILE_DISCOVER_SHEET_HEIGHT.expanded)
    const withComfort = resolveMobileSheetBottomInsetPx(
      844,
      MOBILE_DISCOVER_SHEET_HEIGHT.expanded,
    )
    assert.equal(withComfort - withoutComfort, MOBILE_SHEET_BOTTOM_COMFORT_PX)
  })

  it('caps inset so a minimum visible map strip remains', () => {
    const inset = resolveMobileSheetBottomInsetPx(200, 0.99)
    assert.ok(inset < 200)
  })
})

describe('resolveSelectionPadding', () => {
  it('keeps desktop expanded padding unchanged', () => {
    assert.deepEqual(
      resolveSelectionPadding({
        isMobile: false,
        isExpanded: true,
        mapHeightPx: 900,
        selection,
      }),
      selection.paddingExpanded,
    )
  })

  it('keeps desktop collapsed padding unchanged', () => {
    assert.deepEqual(
      resolveSelectionPadding({
        isMobile: false,
        isExpanded: false,
        mapHeightPx: 900,
        selection,
      }),
      selection.paddingCollapsed,
    )
  })

  it('uses browse fallback on mobile when detail sheet is not open', () => {
    const padding = resolveSelectionPadding({
      isMobile: true,
      isExpanded: true,
      mapHeightPx: 800,
      selection,
      showingResourceDetail: false,
    })
    const expectedBottom = resolveMobileSheetBottomInsetPx(
      800,
      selection.paddingMobile.bottomInsetFraction,
    )
    assert.deepEqual(padding, {
      topLeft: selection.paddingMobile.topLeft,
      bottomRight: [selection.paddingMobile.bottomRightX, expectedBottom],
    })
  })

  it('uses expanded sheet coverage on mobile when resource detail is open', () => {
    const mapHeightPx = 844
    const browse = resolveSelectionPadding({
      isMobile: true,
      isExpanded: true,
      mapHeightPx,
      selection,
      showingResourceDetail: false,
    })
    const detail = resolveSelectionPadding({
      isMobile: true,
      isExpanded: true,
      mapHeightPx,
      selection,
      showingResourceDetail: true,
    })
    assert.ok(detail.bottomRight[1] > browse.bottomRight[1])
    assert.equal(
      detail.bottomRight[1],
      resolveMobileSheetBottomInsetPx(
        mapHeightPx,
        MOBILE_DISCOVER_SHEET_HEIGHT.expanded,
      ),
    )
  })

  it('adapts detail inset across common mobile viewport heights', () => {
    const heights = [800, 844, 932]
    const insets = heights.map((height) =>
      resolveSelectionPadding({
        isMobile: true,
        isExpanded: true,
        mapHeightPx: height,
        selection,
        showingResourceDetail: true,
      }).bottomRight[1],
    )
    assert.ok(insets[0] < insets[1])
    assert.ok(insets[1] < insets[2])
  })
})
