import { Outlet } from 'react-router-dom'

/**
 * Shell for authenticated staff routes.
 * Staff Workspace navigation lives in the shared NavigationRail when authenticated.
 */
export function StaffLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
