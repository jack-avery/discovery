import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/shared/toast'
import { AuthProvider } from './AuthProvider'
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
            <SearchProvider>{children}</SearchProvider>
          </NavigationRailProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
