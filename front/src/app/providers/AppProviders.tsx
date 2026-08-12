import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/shared/toast'
import { AuthProvider } from './AuthProvider'
import { MobileNavMenuProvider } from './MobileNavMenuProvider'
import { NavigationRailProvider } from './NavigationRailProvider'
import { SearchProvider } from './SearchProvider'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <NavigationRailProvider>
            <MobileNavMenuProvider>
              <SearchProvider>{children}</SearchProvider>
            </MobileNavMenuProvider>
          </NavigationRailProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
