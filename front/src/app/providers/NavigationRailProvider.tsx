import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface NavigationRailContextValue {
  isCollapsed: boolean
  toggleCollapsed: () => void
  expand: () => void
  collapse: () => void
}

const NavigationRailContext = createContext<NavigationRailContextValue | null>(null)

export function NavigationRailProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleCollapsed = useCallback(() => setIsCollapsed((prev) => !prev), [])
  const expand = useCallback(() => setIsCollapsed(false), [])
  const collapse = useCallback(() => setIsCollapsed(true), [])

  const value = useMemo(
    () => ({ isCollapsed, toggleCollapsed, expand, collapse }),
    [isCollapsed, toggleCollapsed, expand, collapse],
  )

  return (
    <NavigationRailContext.Provider value={value}>{children}</NavigationRailContext.Provider>
  )
}

export function useNavigationRail() {
  const context = useContext(NavigationRailContext)
  if (!context) {
    throw new Error('useNavigationRail must be used within NavigationRailProvider')
  }
  return context
}
