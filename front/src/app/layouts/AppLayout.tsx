import { Outlet } from 'react-router-dom'
import { useSidebar } from '@/app/providers/SidebarProvider'
import { Sidebar } from '@/components/shared'

export function AppLayout() {
  const { isOpen, closeSidebar } = useSidebar()

  return (
    <div className="flex h-full bg-background text-foreground">
      <Sidebar isOpen={isOpen} onClose={closeSidebar} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden" id="main-content">
        <Outlet />
      </main>
    </div>
  )
}
