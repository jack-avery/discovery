import { useContext } from 'react'
import { useSelection } from '@/app/providers/SelectionProvider'
import { WorkspaceNavigationContext } from '@/features/discover/providers/WorkspaceNavigationProvider'

/**
 * Resource selection for map markers.
 * Uses workspace navigation on Discover; falls back to SelectionProvider elsewhere.
 */
export function useResourceSelection() {
  const workspaceNav = useContext(WorkspaceNavigationContext)

  if (workspaceNav) {
    return {
      selectedResourceId: workspaceNav.selectedResourceId,
      selectResource: workspaceNav.selectResource,
      clearSelection: workspaceNav.clearSelection,
    }
  }

  return useSelection()
}
