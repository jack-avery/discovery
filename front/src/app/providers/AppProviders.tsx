import { ToastProvider } from '@/components/shared/toast'
import { browserRouter } from '@/app/router/browserRouter'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import { MobileNavMenuProvider } from './MobileNavMenuProvider'
import { NavigationRailProvider } from './NavigationRailProvider'
import { SearchProvider } from './SearchProvider'

export function AppProviders() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NavigationRailProvider>
          <MobileNavMenuProvider>
            <SearchProvider>
              <RouterProvider router={browserRouter} />
            </SearchProvider>
          </MobileNavMenuProvider>
        </NavigationRailProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
