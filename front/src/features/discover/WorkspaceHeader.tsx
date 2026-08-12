import { ChevronLeft, Route } from 'lucide-react'
import { PanelHeader } from '@/components/shared/PanelHeader'
import { useDiscoverTour } from '@/features/discover/tour'
import { useWorkspaceNavigation } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { useWorkspace } from '@/features/discover/providers/WorkspaceProvider'
import { Button } from '@/components/ui'

export function WorkspaceHeader() {
  const { collapse } = useWorkspace()
  const { canGoBack, pop, current } = useWorkspaceNavigation()
  const { startTour, isActive } = useDiscoverTour()

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
        <h2 className="font-heading text-base font-semibold text-foreground">
          Discover Resources
        </h2>
      }
      trailing={
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isActive}
            onClick={startTour}
            className="gap-1.5 text-muted-foreground"
            aria-label="Take a tour"
            title="Take a tour"
          >
            <Route className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Take a tour</span>
          </Button>
          {collapseButton}
        </div>
      }
    />
  )
}
