import type { DiscoverScreenProps } from './DiscoverScreen'
import { useWorkspace } from './providers/WorkspaceProvider'
import { WORKSPACE_COLLAPSED_WIDTH_CLASS, WORKSPACE_WIDTH_CLASS } from './constants'
import { WorkspaceExpandHandle } from './WorkspaceExpandHandle'
import { WorkspaceHeader } from './WorkspaceHeader'
import { WorkspaceNavigationStack } from './WorkspaceNavigationStack'
import { cn } from '@/utils/cn'

export type DiscoverWorkspaceProps = DiscoverScreenProps

export function DiscoverWorkspace(props: DiscoverWorkspaceProps) {
  const { isExpanded } = useWorkspace()

  return (
    <div
      className={cn(
        'flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-surface transition-[width] duration-200',
        isExpanded ? WORKSPACE_WIDTH_CLASS : WORKSPACE_COLLAPSED_WIDTH_CLASS,
      )}
    >
      {isExpanded ? <WorkspaceHeader /> : <WorkspaceExpandHandle />}

      <div className={cn('flex min-h-0 flex-1 flex-col', !isExpanded && 'hidden')}>
        <WorkspaceNavigationStack discoverProps={props} />
      </div>
    </div>
  )
}
