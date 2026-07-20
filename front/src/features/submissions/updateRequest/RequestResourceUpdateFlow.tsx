import { Button } from '@/components/ui'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'
import { useDiscoverSideWorkspace } from '@/features/discover/providers/DiscoverSideWorkspaceProvider'

interface RequestResourceUpdateFlowProps {
  resourceName?: string
}

/**
 * Resource-detail entry point for the shared Update Resource workflow.
 * Public and staff open the same UpdateRequestWorkspace.
 *
 * TODO(update-resource): Rename to UpdateResourceFlow when aligning internal
 * names with product terminology (Update Resource / Resource Update).
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
          Spot something outdated or incomplete? Update this resource so the
          listing stays accurate
          {resourceName ? (
            <>
              {' '}
              for <span className="font-medium text-foreground">{resourceName}</span>
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
          Update Resource
        </Button>
      </div>
    </WorkspaceSection>
  )
}
