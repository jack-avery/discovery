import { useEffect, useState, type ComponentType } from 'react'
import type { DiscoverScreenProps } from './DiscoverScreen'
import { DiscoverScreen } from './DiscoverScreen'
import { ResourceDetailScreen } from './ResourceDetailScreen'
import { useWorkspaceNavigation } from './providers/WorkspaceNavigationProvider'
import { WorkspaceStackLayer } from './WorkspaceStackLayer'

/** Overlay workspace screens keyed by stack entry id (root screen is rendered separately). */
const OVERLAY_SCREENS: Record<string, ComponentType> = {
  'resource-detail': ResourceDetailScreen,
}

const ROOT_SCREEN_ID = 'discover'

interface WorkspaceNavigationStackProps {
  discoverProps: DiscoverScreenProps
}

/**
 * Manages layered workspace screens with slide transitions.
 * The root Discover screen stays mounted underneath pushed screens.
 */
export function WorkspaceNavigationStack({ discoverProps }: WorkspaceNavigationStackProps) {
  const { stack, current } = useWorkspaceNavigation()
  const [mountedOverlayIds, setMountedOverlayIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    stack.forEach((entry) => {
      if (entry.id === ROOT_SCREEN_ID) return
      setMountedOverlayIds((prev) => {
        if (prev.has(entry.id)) return prev
        const next = new Set(prev)
        next.add(entry.id)
        return next
      })
    })
  }, [stack])

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <WorkspaceStackLayer active zIndex={0}>
        <DiscoverScreen {...discoverProps} />
      </WorkspaceStackLayer>

      {Array.from(mountedOverlayIds).map((screenId) => {
        const Screen = OVERLAY_SCREENS[screenId]
        if (!Screen) return null

        const isActive = current.id === screenId

        return (
          <WorkspaceStackLayer key={screenId} active={isActive} zIndex={10}>
            <Screen />
          </WorkspaceStackLayer>
        )
      })}
    </div>
  )
}
