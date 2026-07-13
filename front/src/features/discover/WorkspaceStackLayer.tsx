import type { ReactNode } from 'react'
import { WORKSPACE_STACK_TRANSITION_MS } from '@/features/discover/constants'
import { cn } from '@/utils/cn'

interface WorkspaceStackLayerProps {
  /** When false the layer slides off-screen to the right but stays mounted. */
  active: boolean
  zIndex: number
  children: ReactNode
  className?: string
}

/**
 * A single layer in the workspace navigation stack.
 * Slides in from the right when active; slides out when inactive.
 */
export function WorkspaceStackLayer({
  active,
  zIndex,
  children,
  className,
}: WorkspaceStackLayerProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col bg-surface',
        'transition-transform ease-out',
        active ? 'translate-x-0' : 'translate-x-full pointer-events-none',
        className,
      )}
      style={{
        zIndex,
        transitionDuration: `${WORKSPACE_STACK_TRANSITION_MS}ms`,
      }}
      aria-hidden={!active}
    >
      {children}
    </div>
  )
}
