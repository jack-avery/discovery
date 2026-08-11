import { useContext } from 'react'
import { SelectionContext } from '@/app/providers/SelectionProvider'
import {
  WorkspaceNavigationContext,
  type ResourceOpenOrigin,
} from '@/features/discover/providers/WorkspaceNavigationProvider'

export type { ResourceOpenOrigin }

/**
 * Resource selection for map markers.
 * Uses workspace navigation on Discover; falls back to SelectionProvider elsewhere.
 */
export function useResourceSelection(): {
  selectedResourceId: string | null
  selectResource: (id: string) => void
  clearSelection: () => void
  /** Discover-only: how the current detail was opened. Null outside workspace nav. */
  lastResourceOpenOrigin: ResourceOpenOrigin | null
} {
  const workspaceNav = useContext(WorkspaceNavigationContext)
  const selection = useContext(SelectionContext)

  if (workspaceNav) {
    return {
      selectedResourceId: workspaceNav.selectedResourceId,
      selectResource: workspaceNav.selectResource,
      clearSelection: workspaceNav.clearSelection,
      lastResourceOpenOrigin: workspaceNav.lastResourceOpenOrigin,
    }
  }

  if (!selection) {
    throw new Error(
      'useResourceSelection must be used within WorkspaceNavigationProvider or SelectionProvider',
    )
  }

  return {
    ...selection,
    lastResourceOpenOrigin: null,
  }
}
