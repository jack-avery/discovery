import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface MobileNavMenuContextValue {
  isOpen: boolean
  openMenu: () => void
  closeMenu: () => void
  /**
   * When true, the menu stays open and user dismissals (backdrop / Escape)
   * are ignored — used by the Discover guided tour contribute step.
   */
  tourContributeLock: boolean
  setTourContributeLock: (locked: boolean) => void
}

const MobileNavMenuContext = createContext<MobileNavMenuContextValue | null>(
  null,
)

/**
 * Owns the public mobile hamburger drawer open state so App chrome and the
 * Discover guided tour can coordinate without duplicating the menu.
 */
export function MobileNavMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tourContributeLock, setTourContributeLock] = useState(false)

  const openMenu = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeMenu = useCallback(() => {
    setIsOpen((open) => {
      if (tourContributeLock) return open
      return false
    })
  }, [tourContributeLock])

  const setLock = useCallback((locked: boolean) => {
    setTourContributeLock(locked)
    if (locked) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      isOpen,
      openMenu,
      closeMenu,
      tourContributeLock,
      setTourContributeLock: setLock,
    }),
    [isOpen, openMenu, closeMenu, tourContributeLock, setLock],
  )

  return (
    <MobileNavMenuContext.Provider value={value}>
      {children}
    </MobileNavMenuContext.Provider>
  )
}

export function useMobileNavMenu(): MobileNavMenuContextValue {
  const context = useContext(MobileNavMenuContext)
  if (!context) {
    throw new Error('useMobileNavMenu must be used within MobileNavMenuProvider')
  }
  return context
}
