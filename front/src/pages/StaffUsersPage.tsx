import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { PageShell } from '@/components/shared/PageShell'
import { UserManagementWorkspace } from '@/features/staff/users'

/**
 * Staff User Management — administrator only.
 * Wired to GET/POST/PATCH /users and password setup-token flows.
 */
export function StaffUsersPage() {
  const { permissions } = useAuth()

  if (!permissions.canManageUsers) {
    return <Navigate to="/staff" replace />
  }

  return (
    <PageShell title="User Management">
      <UserManagementWorkspace />
    </PageShell>
  )
}
