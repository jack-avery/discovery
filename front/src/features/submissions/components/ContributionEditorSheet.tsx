import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

interface ContributionEditorSheetProps {
  open: boolean
  title: string
  description?: string
  /** Optional sticky progress indicator rendered under the title. */
  progress?: ReactNode
  onClose: () => void
  /** Footer secondary action. Defaults to onClose. */
  onCancel?: () => void
  /** Primary footer action (save / submit). Omit with hidePrimary for close-only sheets. */
  onSave?: () => void
  saveLabel?: string
  cancelLabel?: string
  /** When true, the primary footer button is not rendered. */
  hidePrimary?: boolean
  primaryDisabled?: boolean
  /** Short explanation shown near the primary action when disabled. */
  primaryHint?: string
  children: ReactNode
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Large contribution editor surface.
 * Desktop: wide right sheet. Mobile: full-screen.
 * Sticky header (title + progress + close) stays visible while the form scrolls.
 * Focus trap, Escape, body scroll lock, and focus return included.
 */
export function ContributionEditorSheet({
  open,
  title,
  description,
  progress,
  onClose,
  onCancel,
  onSave,
  saveLabel = 'Save contribution',
  cancelLabel = 'Cancel',
  hidePrimary = false,
  primaryDisabled = false,
  primaryHint,
  children,
}: ContributionEditorSheetProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  // Keep latest onClose without re-running the open/focus effect on every parent render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const focusTimer = window.setTimeout(() => {
      const focusables = getFocusableElements(panel)
      focusables[0]?.focus()
      if (focusables.length === 0) panel?.focus()
    }, 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !panel) return

      const focusables = getFocusableElements(panel)
      if (focusables.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [open])

  // Keep scroll-margin in sync with sticky header height so sections/errors
  // are not hidden underneath when focused or navigated to.
  useEffect(() => {
    if (!open) return
    const header = headerRef.current
    const scroll = scrollRef.current
    if (!header || !scroll) return

    const syncOffset = () => {
      const offset = header.offsetHeight + 12
      scroll.style.setProperty('--editor-sticky-offset', `${offset}px`)
    }

    syncOffset()
    const observer = new ResizeObserver(syncOffset)
    observer.observe(header)
    return () => observer.disconnect()
  }, [open, progress, description, title])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-surface-overlay"
        aria-label="Close editor"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex h-full w-full flex-col bg-surface shadow-lg outline-none',
          'sm:max-w-xl md:max-w-2xl lg:max-w-3xl',
          'border-l border-border',
        )}
      >
        <header
          ref={headerRef}
          className={cn(
            'shrink-0 border-b border-border bg-surface px-4 py-4 sm:px-6',
            'shadow-sm',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2
                id={titleId}
                className="font-heading text-lg font-semibold text-foreground sm:text-xl"
              >
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close editor"
              className="shrink-0"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          {progress ? <div className="mt-3">{progress}</div> : null}
        </header>

        <div
          ref={scrollRef}
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-4 py-5 scrollbar-thin sm:px-6',
            '[&_[id]]:scroll-mt-[var(--editor-sticky-offset,8rem)]',
          )}
        >
          {children}
        </div>

        <footer className="flex shrink-0 flex-col gap-2 border-t border-border bg-surface px-4 py-3 sm:px-6">
          {primaryHint && primaryDisabled && !hidePrimary ? (
            <p className="text-sm text-muted-foreground">{primaryHint}</p>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel ?? onClose}
            >
              {cancelLabel}
            </Button>
            {!hidePrimary && onSave ? (
              <Button
                type="button"
                variant="primary"
                onClick={onSave}
                disabled={primaryDisabled}
              >
                {saveLabel}
              </Button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  )
}

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
}
