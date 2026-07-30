import type { ReactNode } from 'react'
import { Button } from '@/components/ui'

/** Shared “Edited by reviewer” + reset control for moderation section headers. */
export function SectionEditChrome({
  edited,
  onReset,
}: {
  edited: boolean
  onReset: () => void
}): ReactNode {
  if (!edited) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Edited by reviewer</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto px-2 py-1 text-xs"
        onClick={onReset}
      >
        Reset section
      </Button>
    </div>
  )
}
