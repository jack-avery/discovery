import { useLayoutEffect, useRef, useState } from 'react'

function buildSelectionSummary(names: string[], visibleCount: number): string {
  if (visibleCount >= names.length) {
    return names.join(', ')
  }

  return `${names.slice(0, visibleCount).join(', ')} +${names.length - visibleCount}`
}

function syncMeasureFont(textEl: HTMLElement, measureEl: HTMLElement) {
  const styles = getComputedStyle(textEl)
  measureEl.style.font = styles.font
  measureEl.style.letterSpacing = styles.letterSpacing
}

function measureTextWidth(measureEl: HTMLElement, text: string): number {
  measureEl.textContent = text
  return measureEl.scrollWidth
}

function computeMaxVisibleCount(
  names: string[],
  measureEl: HTMLElement,
  maxWidth: number,
): number {
  if (names.length <= 1) return names.length

  let low = 1
  let high = names.length
  let best = 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = buildSelectionSummary(names, mid)

    if (measureTextWidth(measureEl, candidate) <= maxWidth) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return best
}

function computeSummary(
  names: string[],
  textEl: HTMLElement,
  measureEl: HTMLElement,
  emptyLabel: string,
): string {
  if (names.length === 0) return emptyLabel

  const availableWidth = textEl.clientWidth
  if (availableWidth <= 0) {
    return names.length === 1 ? names[0] : buildSelectionSummary(names, 1)
  }

  syncMeasureFont(textEl, measureEl)
  const visibleCount = computeMaxVisibleCount(names, measureEl, availableWidth)
  return buildSelectionSummary(names, visibleCount)
}

/**
 * Builds a trigger summary that shows as many selected labels as fit in the
 * available width, collapsing to "+N" only when another label would overflow.
 */
export function useResponsiveSelectionSummary(names: string[], emptyLabel: string) {
  const textRef = useRef<HTMLSpanElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const namesKey = names.join('\0')
  const [summary, setSummary] = useState(() =>
    names.length === 0 ? emptyLabel : buildSelectionSummary(names, Math.min(names.length, 2)),
  )

  useLayoutEffect(() => {
    const textEl = textRef.current
    const measureEl = measureRef.current
    if (!textEl || !measureEl) return

    const update = () => {
      setSummary(computeSummary(names, textEl, measureEl, emptyLabel))
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(textEl)

    return () => observer.disconnect()
  }, [namesKey, emptyLabel])

  return { summary, textRef, measureRef }
}
