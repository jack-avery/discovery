import { MAP_BEHAVIOUR } from '@/features/map/config'

/** Matches OverlayPanel `max-w-md` — used to recenter map controls when the panel is open. */
export const RESOURCE_DETAIL_PANEL_WIDTH = MAP_BEHAVIOUR.panel.detailPanelWidth

/** z-index for floating filter toolbar — above ResourceDetailPanel (z-20) and backdrop (z-10). */
export const FLOATING_FILTER_BAR_Z_CLASS = 'z-[30]'

/** Shared chrome for map floating controls — keep sizing in sync across Search, dropdowns, and actions. */
export const FLOATING_CONTROL_HEIGHT_CLASS = 'h-9'

/** Visual chrome applied to floating control triggers (search, buttons, dropdown triggers). */
export const FLOATING_CONTROL_CHROME_CLASSES =
  'rounded-lg border border-border/70 bg-surface/95 shadow-md backdrop-blur-sm supports-[backdrop-filter]:bg-surface/90'
