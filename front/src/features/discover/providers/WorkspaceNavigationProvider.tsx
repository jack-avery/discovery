import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useWorkspace } from '@/features/discover/providers/WorkspaceProvider'

export interface WorkspaceStackEntry {
  id: string
  params?: Record<string, unknown>
}

/** How a resource detail screen was opened — used by the guided tour. */
export type ResourceOpenOrigin = 'results' | 'map' | 'programmatic'

export interface OpenResourceDetailOptions {
  origin?: ResourceOpenOrigin
}

interface WorkspaceNavigationContextValue {
  stack: WorkspaceStackEntry[]
  current: WorkspaceStackEntry
  canGoBack: boolean
  push: (entry: WorkspaceStackEntry) => void
  pop: () => void
  /** Return to the Discover list root without remounting the page. */
  resetToRoot: () => void
  /** Opens or updates the resource detail workspace screen. */
  openResourceDetail: (
    resourceId: string,
    options?: OpenResourceDetailOptions,
  ) => void
  /**
   * Map-marker selection entry point. Opens detail with origin `map`
   * so the guided tour can distinguish pin clicks from result-list clicks.
   */
  selectResource: (resourceId: string) => void
  /** @deprecated Use pop — kept for map marker compatibility. */
  clearSelection: () => void
  selectedResourceId: string | null
  /** Most recent resource-open origin (results / map / programmatic). */
  lastResourceOpenOrigin: ResourceOpenOrigin | null
}

const ROOT_ENTRY: WorkspaceStackEntry = { id: 'discover' }

const WorkspaceNavigationContext = createContext<WorkspaceNavigationContextValue | null>(null)

export { WorkspaceNavigationContext }

export function WorkspaceNavigationProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<WorkspaceStackEntry[]>([ROOT_ENTRY])
  const [lastResourceOpenOrigin, setLastResourceOpenOrigin] =
    useState<ResourceOpenOrigin | null>(null)
  const { isExpanded, expand } = useWorkspace()

  const push = useCallback((entry: WorkspaceStackEntry) => {
    setStack((prev) => [...prev, entry])
  }, [])

  const pop = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }, [])

  const resetToRoot = useCallback(() => {
    setStack([ROOT_ENTRY])
  }, [])

  const openResourceDetail = useCallback(
    (resourceId: string, options?: OpenResourceDetailOptions) => {
      setLastResourceOpenOrigin(options?.origin ?? 'programmatic')
      if (!isExpanded) expand()
      setStack((prev) => {
        const top = prev[prev.length - 1]
        if (top?.id === 'resource-detail') {
          return [
            ...prev.slice(0, -1),
            { id: 'resource-detail', params: { resourceId } },
          ]
        }
        return [...prev, { id: 'resource-detail', params: { resourceId } }]
      })
    },
    [expand, isExpanded],
  )

  const selectResource = useCallback(
    (resourceId: string) => {
      openResourceDetail(resourceId, { origin: 'map' })
    },
    [openResourceDetail],
  )

  const current = stack[stack.length - 1] ?? ROOT_ENTRY
  const canGoBack = stack.length > 1

  const selectedResourceId =
    current.id === 'resource-detail' && typeof current.params?.resourceId === 'string'
      ? current.params.resourceId
      : null

  useEffect(() => {
    if (!canGoBack) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') pop()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [canGoBack, pop])

  const value = useMemo(
    () => ({
      stack,
      current,
      canGoBack,
      push,
      pop,
      resetToRoot,
      openResourceDetail,
      selectResource,
      clearSelection: pop,
      selectedResourceId,
      lastResourceOpenOrigin,
    }),
    [
      stack,
      current,
      canGoBack,
      push,
      pop,
      resetToRoot,
      openResourceDetail,
      selectResource,
      selectedResourceId,
      lastResourceOpenOrigin,
    ],
  )

  return (
    <WorkspaceNavigationContext.Provider value={value}>
      {children}
    </WorkspaceNavigationContext.Provider>
  )
}

export function useWorkspaceNavigation() {
  const context = useContext(WorkspaceNavigationContext)
  if (!context) {
    throw new Error('useWorkspaceNavigation must be used within WorkspaceNavigationProvider')
  }
  return context
}
