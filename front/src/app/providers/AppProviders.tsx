import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { NavigationRailProvider } from './NavigationRailProvider'
import { SearchProvider } from './SearchProvider'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <NavigationRailProvider>
        <SearchProvider>{children}</SearchProvider>
      </NavigationRailProvider>
    </BrowserRouter>
  )
}
