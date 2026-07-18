import { ChevronLeft } from 'lucide-react'
import { PanelHeader } from '@/components/shared/PanelHeader'
import { useWorkspaceNavigation } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { useWorkspace } from '@/features/discover/providers/WorkspaceProvider'
import { Button } from '@/components/ui'

export function WorkspaceHeader() {
  const { collapse } = useWorkspace()
  const { canGoBack, pop, current } = useWorkspaceNavigation()

  const collapseButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={collapse}
      aria-label="Collapse workspace"
      title="Collapse workspace"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
    </Button>
  )

  if (canGoBack && current.id === 'resource-detail') {
    return (
      <PanelHeader
        leading={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={pop}
            aria-label="Back to Discover"
            title="Back to Discover"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        }
        title={
          <h2 className="font-heading text-base font-semibold text-foreground">
            Resource details
          </h2>
        }
        trailing={collapseButton}
      />
    )
  }

  return (
    <PanelHeader
      title={
        <h2 className="font-heading text-base font-semibold text-foreground">Discover Resources</h2>
      }
      trailing={collapseButton}
    />
  )
}
