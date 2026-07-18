import { Outlet } from 'react-router-dom'
import { NavigationRail } from '@/components/shared'

export function AppLayout() {
  return (
    <div className="flex h-full bg-background text-foreground">
      <NavigationRail />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden" id="main-content">
        <Outlet />
      </main>
    </div>
  )
}
