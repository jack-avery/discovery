import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface FloatingControlBubbleProps {
  children: ReactNode
  className?: string
}

/** Shared chrome for map floating controls — keep sizing in sync across Search, dropdowns, and actions. */
export const FLOATING_CONTROL_HEIGHT_CLASS = 'h-9'

export function FloatingControlBubble({ children, className }: FloatingControlBubbleProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex shrink-0 items-center overflow-hidden rounded-lg border border-border/70 bg-surface/95 shadow-md backdrop-blur-sm supports-[backdrop-filter]:bg-surface/90',
        FLOATING_CONTROL_HEIGHT_CLASS,
        className,
      )}
    >
      {children}
    </div>
  )
}
