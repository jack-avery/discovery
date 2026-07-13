import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface WorkspaceContextValue {
  isExpanded: boolean
  toggleExpanded: () => void
  expand: () => void
  collapse: () => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), [])
  const expand = useCallback(() => setIsExpanded(true), [])
  const collapse = useCallback(() => setIsExpanded(false), [])

  const value = useMemo(
    () => ({ isExpanded, toggleExpanded, expand, collapse }),
    [isExpanded, toggleExpanded, expand, collapse],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return context
}
