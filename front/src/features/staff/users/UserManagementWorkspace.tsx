import { useEffect, useState, type ReactNode } from 'react'
import { Search, Users } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { EmptyState, useToast } from '@/components/shared'
import { Button, Card } from '@/components/ui'
import { EnableDisableDialog } from '@/features/staff/users/EnableDisableDialog'
import { ResetPasswordDialog } from '@/features/staff/users/ResetPasswordDialog'
import { UserModal } from '@/features/staff/users/UserModal'
import { UsersPagination } from '@/features/staff/users/UsersPagination'
import { UsersTable } from '@/features/staff/users/UsersTable'
import { UsersToolbar, type UsersRoleFilter } from '@/features/staff/users/UsersToolbar'
import { useManagedUsers } from '@/features/staff/users/useManagedUsers'
import { MOCK_CURRENT_USER_ID } from '@/features/staff/users/userSession'
import type { UserFormValues } from '@/features/staff/users/userFormModel'
import type { ManagedUser, UserSortField } from '@/types/user'

type UserDialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; user: ManagedUser }
  | { type: 'reset'; user: ManagedUser }
  | { type: 'disable'; user: ManagedUser }
  | { type: 'enable'; user: ManagedUser }

/**
 * Full User Management workspace: toolbar, table, pagination, and row actions.
 */
export function UserManagementWorkspace() {
  const toast = useToast()
  const { user: sessionUser } = useAuth()
  const currentUserId = sessionUser?.user_id ?? MOCK_CURRENT_USER_ID

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [role, setRole] = useState<UsersRoleFilter>('all')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [sort, setSort] = useState<UserSortField>('default')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<UserDialogState>({ type: 'closed' })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
    }, 200)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, role, includeInactive, sort])

  const { users, pagination, setUserActive, createUser, updateUser } =
    useManagedUsers({
      search: debouncedSearch,
      role,
      includeInactive,
      sort,
      page,
    })

  const hasActiveQuery =
    debouncedSearch.trim().length > 0 || role !== 'all'

  const closeDialog = () => setDialog({ type: 'closed' })

  const handleCreateSave = (values: UserFormValues) => {
    const result = createUser(values)
    if (!result.ok) return result.errors
    closeDialog()
    toast.success('User created.')
  }

  const handleEditSave = (values: UserFormValues) => {
    if (dialog.type !== 'edit') return
    const result = updateUser(dialog.user.user_id, values)
    if (!result.ok) return result.errors
    closeDialog()
    toast.success('User updated.')
  }

  const handleResetConfirm = () => {
    if (dialog.type !== 'reset') return
    closeDialog()
    toast.success('Password reset to the organization default.')
  }

  const handleDisableConfirm = () => {
    if (dialog.type !== 'disable') return
    const target = dialog.user
    setUserActive(target.user_id, false)
    closeDialog()
    toast.success('User disabled.')
  }

  const handleEnableConfirm = () => {
    if (dialog.type !== 'enable') return
    const target = dialog.user
    setUserActive(target.user_id, true)
    closeDialog()
    toast.success('User enabled.')
  }

  let body: ReactNode

  if (users.length === 0) {
    body = (
      <div className="flex min-h-[16rem] items-center justify-center px-4 py-8">
        {hasActiveQuery ? (
          <EmptyState
            title="No matching users"
            description="No staff accounts match your search. Try different keywords or clear the search."
            icon={
              <Search className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            }
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setDebouncedSearch('')
                  setRole('all')
                }}
              >
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No users yet"
            description="Staff accounts will appear here once they are created."
            icon={
              <Users className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            }
          />
        )}
      </div>
    )
  } else {
    body = (
      <>
        <UsersTable
          users={users}
          currentUserId={currentUserId}
          onEdit={(user) => setDialog({ type: 'edit', user })}
          onResetPassword={(user) => setDialog({ type: 'reset', user })}
          onDisable={(user) => setDialog({ type: 'disable', user })}
          onEnable={(user) => setDialog({ type: 'enable', user })}
        />
        <UsersPagination pagination={pagination} onPageChange={setPage} />
      </>
    )
  }

  const editUser = dialog.type === 'edit' ? dialog.user : null
  const confirmUser =
    dialog.type === 'reset' ||
    dialog.type === 'disable' ||
    dialog.type === 'enable'
      ? dialog.user
      : null

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage staff accounts and permissions.
      </p>

      <Card className="overflow-hidden shadow-sm">
        <UsersToolbar
          search={search}
          role={role}
          includeInactive={includeInactive}
          sort={sort}
          resultCount={pagination.total_items}
          onSearchChange={setSearch}
          onRoleChange={setRole}
          onIncludeInactiveChange={setIncludeInactive}
          onSortChange={setSort}
          onCreateUser={() => setDialog({ type: 'create' })}
        />
        {body}
      </Card>

      <UserModal
        open={dialog.type === 'create'}
        mode="create"
        onCancel={closeDialog}
        onSave={handleCreateSave}
      />

      <UserModal
        open={dialog.type === 'edit'}
        mode="edit"
        initialUser={editUser}
        disableRoleChange={
          editUser != null && editUser.user_id === currentUserId
        }
        onCancel={closeDialog}
        onSave={handleEditSave}
      />

      <ResetPasswordDialog
        open={dialog.type === 'reset'}
        user={confirmUser}
        onCancel={closeDialog}
        onConfirm={handleResetConfirm}
      />

      <EnableDisableDialog
        open={dialog.type === 'disable'}
        mode="disable"
        user={confirmUser}
        onCancel={closeDialog}
        onConfirm={handleDisableConfirm}
      />

      <EnableDisableDialog
        open={dialog.type === 'enable'}
        mode="enable"
        user={confirmUser}
        onCancel={closeDialog}
        onConfirm={handleEnableConfirm}
      />
    </div>
  )
}
