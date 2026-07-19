import { MAP_REGION_WORKSPACE_Z_CLASS } from './constants'
import { useDiscoverSideWorkspace } from './providers/DiscoverSideWorkspaceProvider'
import { UpdateRequestWorkspace } from '@/features/submissions/updateRequest/UpdateRequestWorkspace'
import { cn } from '@/utils/cn'

/**
 * Discover editing overlay hosted inside the map region.
 * Covers the map completely while open; the map stays mounted underneath.
 * Open/close identity comes from DiscoverSideWorkspaceProvider.
 * Dismissal / unsaved-changes belong to the hosted workspace component.
 */
export function DiscoverSideWorkspace() {
  const { isOpen, activeKind, close } = useDiscoverSideWorkspace()

  if (!isOpen || !activeKind) return null

  return (
    <div
      className={cn(
        // Cover the map region only — sibling of MapContainer, not a modal.
        'absolute inset-0 flex min-h-0 flex-col overflow-hidden',
        'border-l border-border bg-surface',
        MAP_REGION_WORKSPACE_Z_CLASS,
      )}
      aria-label="Editing workspace"
      role="region"
    >
      {activeKind === 'update-request' ? (
        <UpdateRequestWorkspace onClose={close} />
      ) : null}
    </div>
  )
}
