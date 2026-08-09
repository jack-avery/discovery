import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false
    if (element.getAttribute('aria-disabled') === 'true') return false
    return element.getClientRects().length > 0
  })
}

interface UseDialogAccessibilityOptions {
  open: boolean
  /** Called when Escape is pressed (unless dismiss is disabled). */
  onDismiss?: () => void
  /** When true, Escape does not dismiss (e.g. while submitting). */
  dismissDisabled?: boolean
}

/**
 * Focus trap + Escape dismiss + restore focus for modal dialogs.
 * Attach the returned ref to the outermost dialog portal container.
 */
export function useDialogAccessibility({
  open,
  onDismiss,
  dismissDisabled = false,
}: UseDialogAccessibilityOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const container = containerRef.current
    if (!container) return

    const panel =
      (container.querySelector(
        '[role="alertdialog"], [role="dialog"]',
      ) as HTMLElement | null) ?? container

    const focusables = getFocusableElements(panel)
    const initial = focusables[0] ?? panel
    // Defer so the dialog is in the accessibility tree before focusing.
    const focusFrame = window.requestAnimationFrame(() => {
      initial.focus()
    })

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (dismissDisabled || !onDismiss) return
        event.preventDefault()
        event.stopPropagation()
        onDismiss()
        return
      }

      if (event.key !== 'Tab') return

      const items = getFocusableElements(panel)
      if (items.length === 0) {
        event.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown, true)
      const previous = previousFocusRef.current
      if (previous && typeof previous.focus === 'function') {
        previous.focus()
      }
    }
  }, [open, onDismiss, dismissDisabled])

  return containerRef
}
