import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'

interface DiscoverCatalogRefreshContextValue {
  /** Re-fetch Discover list + map pins after a catalog mutation (e.g. soft-delete). */
  reloadCatalog: () => void
}

const DiscoverCatalogRefreshContext =
  createContext<DiscoverCatalogRefreshContextValue | null>(null)

export function DiscoverCatalogRefreshProvider({
  children,
  reloadCatalog,
}: {
  children: ReactNode
  reloadCatalog: () => void
}) {
  const value = useMemo(
    () => ({ reloadCatalog }),
    [reloadCatalog],
  )

  return (
    <DiscoverCatalogRefreshContext.Provider value={value}>
      {children}
    </DiscoverCatalogRefreshContext.Provider>
  )
}

export function useDiscoverCatalogRefresh() {
  const context = useContext(DiscoverCatalogRefreshContext)
  if (!context) {
    throw new Error(
      'useDiscoverCatalogRefresh must be used within DiscoverCatalogRefreshProvider',
    )
  }
  return context
}
