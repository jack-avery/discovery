import { Outlet } from 'react-router-dom'
import { MobilePublicHeader, NavigationRail } from '@/components/shared'

export function AppLayout() {
  return (
    <div className="flex h-full max-h-[100dvh] bg-background text-foreground">
      <NavigationRail />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <MobilePublicHeader />
        <main
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          id="main-content"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
