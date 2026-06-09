import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface SelectionContextValue {
  selectedResourceId: string | null
  selectResource: (id: string) => void
  clearSelection: () => void
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)

  const selectResource = useCallback((id: string) => {
    setSelectedResourceId(id)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedResourceId(null)
  }, [])

  const value = useMemo(
    () => ({ selectedResourceId, selectResource, clearSelection }),
    [selectedResourceId, selectResource, clearSelection],
  )

  return (
    <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
  )
}

export function useSelection() {
  const context = useContext(SelectionContext)
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider')
  }
  return context
}
