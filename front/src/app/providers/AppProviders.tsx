import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { SearchProvider } from './SearchProvider'
import { SidebarProvider } from './SidebarProvider'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <SidebarProvider>
        <SearchProvider>{children}</SearchProvider>
      </SidebarProvider>
    </BrowserRouter>
  )
}
