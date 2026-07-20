import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/** Extensible set of Discover side-workspace hosts (layout identity only). */
// TODO(update-resource): Rename kind 'update-request' → 'update-resource' when
// aligning internal identifiers with product terminology.
export type DiscoverSideWorkspaceKind = 'update-request'

interface DiscoverSideWorkspaceContextValue {
  /** Active workspace kind, or null when the side column is closed. */
  activeKind: DiscoverSideWorkspaceKind | null
  isOpen: boolean
  open: (kind: DiscoverSideWorkspaceKind) => void
  close: () => void
}

const DiscoverSideWorkspaceContext =
  createContext<DiscoverSideWorkspaceContextValue | null>(null)

/**
 * Layout/navigation only: which side workspace is open.
 * Workflow state belongs inside the hosted workspace component (e.g. UpdateRequestWorkspace).
 */
export function DiscoverSideWorkspaceProvider({
  children,
}: {
  children: ReactNode
}) {
  const [activeKind, setActiveKind] = useState<DiscoverSideWorkspaceKind | null>(
    null,
  )

  const open = useCallback((kind: DiscoverSideWorkspaceKind) => {
    setActiveKind(kind)
  }, [])

  const close = useCallback(() => {
    setActiveKind(null)
  }, [])

  const value = useMemo(
    () => ({
      activeKind,
      isOpen: activeKind !== null,
      open,
      close,
    }),
    [activeKind, open, close],
  )

  return (
    <DiscoverSideWorkspaceContext.Provider value={value}>
      {children}
    </DiscoverSideWorkspaceContext.Provider>
  )
}

export function useDiscoverSideWorkspace() {
  const context = useContext(DiscoverSideWorkspaceContext)
  if (!context) {
    throw new Error(
      'useDiscoverSideWorkspace must be used within DiscoverSideWorkspaceProvider',
    )
  }
  return context
}
