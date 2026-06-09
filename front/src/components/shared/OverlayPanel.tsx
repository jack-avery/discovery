import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface OverlayPanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Desktop: right slide-in. Mobile: bottom sheet when true. */
  mobileSheet?: boolean
  className?: string
}

export function OverlayPanel({
  isOpen,
  onClose,
  title,
  children,
  mobileSheet = false,
  className,
}: OverlayPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) panelRef.current?.focus()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div
        className="absolute inset-0 z-10 bg-primary/10 md:bg-transparent"
        onClick={onClose}
        aria-hidden="true"
        data-testid="overlay-panel-backdrop"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'absolute z-20 flex flex-col bg-surface shadow-lg focus:outline-none',
          'transition-transform duration-300 ease-out',
          mobileSheet
            ? 'inset-x-0 bottom-0 max-h-[75vh] rounded-t-xl border-t border-border md:inset-x-auto md:bottom-0 md:top-0 md:max-h-none md:w-full md:max-w-md md:rounded-none md:rounded-l-xl md:border-l md:border-t-0'
            : 'inset-y-0 right-0 w-full max-w-md border-l border-border',
          className,
        )}
      >
        {children}
      </div>
    </>
  )
}
