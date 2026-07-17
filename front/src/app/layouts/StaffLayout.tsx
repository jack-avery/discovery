import { Outlet } from 'react-router-dom'

/**
 * Shell for authenticated staff routes.
 *
 * Milestone 1: outlet-only wrapper so Milestone 2 can introduce a staff
 * sidebar (Dashboard, Review Submissions, Review Update Requests) without
 * restructuring routes.
 */
export function StaffLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Milestone 2: StaffWorkspaceNavigation */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
