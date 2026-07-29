import { Users } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { PageShell } from '@/components/shared/PageShell'
import { EmptyState } from '@/components/shared'

/**
 * Placeholder staff page for User Management (administrator only).
 */
export function StaffUsersPage() {
  const { permissions } = useAuth()

  if (!permissions.canManageUsers) {
    return <Navigate to="/staff" replace />
  }

  return (
    <PageShell
      title="User Management"
      description="Manage staff accounts, roles, and access permissions."
    >
      <div className="flex min-h-[16rem] items-center justify-center">
        <EmptyState
          title="User Management coming next"
          description="Administrator tools for managing staff accounts and roles will appear here in a later milestone."
          icon={
            <Users className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          }
        />
      </div>
    </PageShell>
  )
}
