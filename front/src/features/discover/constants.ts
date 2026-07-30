/** z-index for floating filter toolbar — above workspace stack layers. */
export const FLOATING_FILTER_BAR_Z_CLASS = 'z-[30]'

/** Shared chrome for map floating controls — keep sizing in sync across Search, dropdowns, and actions. */
export const FLOATING_CONTROL_HEIGHT_CLASS = 'h-9'

/** Visual chrome applied to floating control triggers (search, buttons, dropdown triggers). */
export const FLOATING_CONTROL_CHROME_CLASSES =
  'rounded-lg border border-border/70 bg-surface/95 shadow-md backdrop-blur-sm supports-[backdrop-filter]:bg-surface/90'

/**
 * Discover workspace panel width when expanded.
 * Desktop is slightly wider so resource detail fits more of the first viewport;
 * base `w-80` preserves existing mobile/narrow behaviour.
 */
export const WORKSPACE_WIDTH_CLASS = 'w-80 md:w-[23rem]'

/** Leading-edge strip width when the workspace is collapsed. */
export const WORKSPACE_COLLAPSED_WIDTH_CLASS = 'w-10'

/** Slide transition duration for workspace navigation stack layers. */
export const WORKSPACE_STACK_TRANSITION_MS = 300

/**
 * z-index for Discover editing overlays hosted inside the map region.
 * Above floating Staff Portal chrome so the workspace owns the top-right while open.
 */
export const MAP_REGION_WORKSPACE_Z_CLASS = 'z-[40]'
