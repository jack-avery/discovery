import type { ReactNode } from 'react'
import {
  FLOATING_CONTROL_CHROME_CLASSES,
  FLOATING_CONTROL_HEIGHT_CLASS,
} from '@/features/discover/constants'
import { cn } from '@/utils/cn'

interface FloatingControlBubbleProps {
  children: ReactNode
  className?: string
}

export function FloatingControlBubble({ children, className }: FloatingControlBubbleProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex shrink-0 items-center overflow-hidden',
        FLOATING_CONTROL_CHROME_CLASSES,
        FLOATING_CONTROL_HEIGHT_CLASS,
        className,
      )}
    >
      {children}
    </div>
  )
}
