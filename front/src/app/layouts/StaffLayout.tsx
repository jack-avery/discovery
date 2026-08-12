import { Outlet } from 'react-router-dom'
import { StaffMobileUnavailable } from '@/app/layouts/StaffMobileUnavailable'
import { useIsMobile } from '@/hooks/useIsMobile'

/**
 * Shell for authenticated staff routes.
 * Staff Workspace navigation lives in the shared NavigationRail when authenticated.
 * Below `md`, staff routes show a dedicated unavailable state — public routes stay available.
 */
export function StaffLayout() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <StaffMobileUnavailable />
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
