import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * Canonical public mobile breakpoint — matches Tailwind `md` (768px).
 * Mobile: viewports below 768px. Desktop: `md:` and up.
 */
export const MOBILE_MAX_WIDTH_PX = 767

export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_MAX_WIDTH_PX}px)`

/** True when the viewport is below the `md` (768px) breakpoint. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_MEDIA_QUERY)
}
