import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useToast } from '@/components/shared'
import { Button } from '@/components/ui'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'
import { useDiscoverCatalogRefresh } from '@/features/discover/providers/DiscoverCatalogRefreshProvider'
import { useDiscoverSideWorkspace } from '@/features/discover/providers/DiscoverSideWorkspaceProvider'
import { useWorkspaceNavigation } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { ConfirmDialog } from '@/features/submissions/form/ConfirmDialog'
import {
  deleteResource,
  toDeleteResourceErrorMessage,
} from '@/services/resourceService'

interface RequestResourceUpdateFlowProps {
  resourceId: number
  resourceName?: string
}

/**
 * Resource-detail entry point for the shared Update Resource workflow.
 * Public and staff open the same UpdateRequestWorkspace.
 * Administrators also see soft-delete beside Update Resource.
 *
 * TODO(update-resource): Rename to UpdateResourceFlow when aligning internal
 * names with product terminology (Update Resource / Resource Update).
 */
export function RequestResourceUpdateFlow({
  resourceId,
  resourceName,
}: RequestResourceUpdateFlowProps) {
  const { open: openSideWorkspace, close: closeSideWorkspace, isOpen: sideWorkspaceOpen } =
    useDiscoverSideWorkspace()
  const { permissions } = useAuth()
  const toast = useToast()
  const { pop } = useWorkspaceNavigation()
  const { reloadCatalog } = useDiscoverCatalogRefresh()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const canDelete = permissions.canDeleteResources

  const handleCancelDelete = () => {
    if (isDeleting) return
    setConfirmOpen(false)
  }

  const handleConfirmDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await deleteResource(resourceId)
      setConfirmOpen(false)
      toast.success('Resource deleted.')
      if (sideWorkspaceOpen) closeSideWorkspace()
      pop()
      reloadCatalog()
    } catch (error) {
      toast.error(toDeleteResourceErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openSideWorkspace('update-request')}
            >
              Update Resource
            </Button>
            {canDelete ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-danger text-danger-foreground hover:bg-danger/90"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete Resource
              </Button>
            ) : null}
          </div>
        </div>
      </WorkspaceSection>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Resource?"
        description={
          <>
            <p>
              This resource will no longer appear in the public directory and
              will be removed from staff workspaces.
            </p>
            <p>Are you sure you want to delete this resource?</p>
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Delete Resource"
        destructive
        isSubmitting={isDeleting}
        onCancel={handleCancelDelete}
        onConfirm={() => {
          void handleConfirmDelete()
        }}
      />
    </>
  )
}
