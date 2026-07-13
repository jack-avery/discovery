import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { useWorkspaceNavigation } from '@/features/discover/providers/WorkspaceNavigationProvider'

/**
 * Resource detail workspace screen — placeholder until API integration.
 * Rendered as a stack layer over the Discover screen.
 */
export function ResourceDetailScreen() {
  const { current } = useWorkspaceNavigation()
  const resourceId =
    current.id === 'resource-detail' && typeof current.params?.resourceId === 'string'
      ? current.params.resourceId
      : null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
      <div className="workspace-content flex-1">
        <EmptyState
          title="Details not available"
          description={
            resourceId
              ? `Information for resource ${resourceId} will appear here once the API is connected.`
              : 'Information for the selected resource will appear here once the API is connected.'
          }
          icon={<FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
          className="py-12"
        />
      </div>
    </div>
  )
}
