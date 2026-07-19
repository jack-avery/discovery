import { Button } from '@/components/ui'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'
import { useDiscoverSideWorkspace } from '@/features/discover/providers/DiscoverSideWorkspaceProvider'
import type { ResourceVersionDto } from '@/types/resource'

interface RequestResourceUpdateFlowProps {
  resourceId: number
  resourceName?: string
  /** Approved version — kept for call-site compatibility; workspace loads detail itself. */
  version: ResourceVersionDto
}

/**
 * Resource-detail entry point for update requests.
 * Opens the Discover UpdateRequestWorkspace (picker → continuous editor).
 */
export function RequestResourceUpdateFlow({
  resourceName,
}: RequestResourceUpdateFlowProps) {
  const { open: openSideWorkspace } = useDiscoverSideWorkspace()

  return (
    <WorkspaceSection
      title="Help keep this information accurate"
      aria-label="Help keep this information accurate"
    >
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Spot something outdated or incomplete? Request an update so our team
          can review the change
          {resourceName ? (
            <>
              {' '}
              to <span className="font-medium text-foreground">{resourceName}</span>
            </>
          ) : null}
          .
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openSideWorkspace('update-request')}
        >
          Request an update
        </Button>
      </div>
    </WorkspaceSection>
  )
}
