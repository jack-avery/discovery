import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

interface ContributionEditorSheetProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  onSave: () => void
  saveLabel?: string
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
 * Focus trap, Escape, body scroll lock, and focus return included.
 */
export function ContributionEditorSheet({
  open,
  title,
  description,
  onClose,
  onSave,
  saveLabel = 'Save contribution',
  children,
}: ContributionEditorSheetProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

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
        onClose()
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
  }, [open, onClose])

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
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
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
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 scrollbar-thin sm:px-6">
          {children}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-surface px-4 py-3 sm:px-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={onSave}>
            {saveLabel}
          </Button>
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
