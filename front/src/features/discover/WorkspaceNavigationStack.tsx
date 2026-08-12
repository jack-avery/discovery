import { useEffect, useRef, useState, type ComponentType } from 'react'
import type { DiscoverScreenProps } from './DiscoverScreen'
import { DiscoverScreen } from './DiscoverScreen'
import { ResourceDetailScreen } from './ResourceDetailScreen'
import { WORKSPACE_STACK_TRANSITION_MS } from '@/features/discover/constants'
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
 * Overlays removed from the stack unmount after their exit transition so a
 * stale empty Resource Detail cannot remain targetable by the guided tour.
 */
export function WorkspaceNavigationStack({
  discoverProps,
}: WorkspaceNavigationStackProps) {
  const { stack, current } = useWorkspaceNavigation()
  const [mountedOverlayIds, setMountedOverlayIds] = useState<Set<string>>(
    () => new Set(),
  )
  const unmountTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const idsInStack = new Set(
      stack
        .map((entry) => entry.id)
        .filter((id) => id !== ROOT_SCREEN_ID),
    )

    setMountedOverlayIds((prev) => {
      const next = new Set(prev)
      let changed = false
      idsInStack.forEach((id) => {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      })
      return changed ? next : prev
    })

    if (unmountTimerRef.current != null) {
      window.clearTimeout(unmountTimerRef.current)
      unmountTimerRef.current = null
    }

    unmountTimerRef.current = window.setTimeout(() => {
      setMountedOverlayIds((prev) => {
        const next = new Set([...prev].filter((id) => idsInStack.has(id)))
        return next.size === prev.size ? prev : next
      })
      unmountTimerRef.current = null
    }, WORKSPACE_STACK_TRANSITION_MS)

    return () => {
      if (unmountTimerRef.current != null) {
        window.clearTimeout(unmountTimerRef.current)
        unmountTimerRef.current = null
      }
    }
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
