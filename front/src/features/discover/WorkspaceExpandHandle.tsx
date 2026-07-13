import { ChevronRight } from 'lucide-react'
import { useWorkspace } from '@/features/discover/providers/WorkspaceProvider'
import { Button } from '@/components/ui'

/** Expand control shown on the leading edge when the workspace is collapsed. */
export function WorkspaceExpandHandle() {
  const { expand } = useWorkspace()

  return (
    <div className="flex h-full w-full flex-col items-center border-r border-border bg-surface pt-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={expand}
        aria-label="Expand workspace"
        title="Expand workspace"
        className="shrink-0"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
