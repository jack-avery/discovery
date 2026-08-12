import { findTourTarget, TOUR_TARGETS } from '@/features/discover/tour/tourTargets'

/**
 * Poll until a tour target exists in the DOM (e.g. after opening resource detail).
 */
export async function waitForTourTarget(
  targetId: string,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<HTMLElement | null> {
  const timeoutMs = options?.timeoutMs ?? 4000
  const intervalMs = options?.intervalMs ?? 50
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    const el = findTourTarget(targetId)
    if (el) return el
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs))
  }
  return findTourTarget(targetId)
}

/**
 * Scroll a tour target into view inside the Resource Detail / workspace
 * scroll container when possible, instead of scrolling the window.
 */
export function scrollTourTargetIntoDetailView(
  target: HTMLElement,
  reduceMotion: boolean,
): void {
  const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth'
  const container =
    target.closest<HTMLElement>('[data-tour="resource-detail"]') ??
    target.closest<HTMLElement>('.scrollbar-thin')

  if (container && container !== target) {
    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const offset =
      targetRect.top -
      containerRect.top -
      containerRect.height / 2 +
      targetRect.height / 2
    container.scrollBy({ top: offset, behavior })
    return
  }

  target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior })
}

/**
 * Reset Resource Detail to its normal top position (not window scroll).
 */
export function scrollResourceDetailToTop(reduceMotion: boolean): void {
  const detail = findTourTarget(TOUR_TARGETS.resourceDetail)
  if (!detail) return
  detail.scrollTo({
    top: 0,
    behavior: reduceMotion ? 'auto' : 'smooth',
  })
}
