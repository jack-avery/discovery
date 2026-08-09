import { useEffect, useState, type ReactNode } from 'react'
import { Search, Users } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { EmptyState, useToast } from '@/components/shared'
import { Button, Card } from '@/components/ui'
import { EnableDisableDialog } from '@/features/staff/users/EnableDisableDialog'
import { ResetPasswordDialog } from '@/features/staff/users/ResetPasswordDialog'
import { SetupLinkDialog } from '@/features/staff/users/SetupLinkDialog'
import { UserModal } from '@/features/staff/users/UserModal'
import { UsersPagination } from '@/features/staff/users/UsersPagination'
import { UsersTable } from '@/features/staff/users/UsersTable'
import { UsersTableSkeleton } from '@/features/staff/users/UsersTableSkeleton'
import { UsersToolbar, type UsersRoleFilter } from '@/features/staff/users/UsersToolbar'
import type { UserFormValues } from '@/features/staff/users/userFormModel'
import { useUsers } from '@/hooks/useUsers'
import {
  createUser,
  resetUserPassword,
  updateUser,
  userFormErrorsFromApi,
  type SetupCredentials,
} from '@/services/userService'
import type { ManagedUser, UserSortField } from '@/types/user'
import { toUserFacingErrorMessage } from '@/utils/userFacingError'

type UserDialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; user: ManagedUser }
  | { type: 'reset'; user: ManagedUser }
  | { type: 'disable'; user: ManagedUser }
  | { type: 'enable'; user: ManagedUser }

type SetupLinkState = {
  mode: 'create' | 'reset'
  user: Pick<ManagedUser, 'first_name' | 'last_name' | 'email'>
  setup: SetupCredentials
} | null

/**
 * Full User Management workspace: toolbar, table, pagination, and row actions.
 * Mutations call the API and refetch the authoritative list on success.
 */
export function UserManagementWorkspace() {
  const toast = useToast()
  const { user: sessionUser } = useAuth()
  const currentUserId = sessionUser?.user_id

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [role, setRole] = useState<UsersRoleFilter>('all')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [sort, setSort] = useState<UserSortField>('default')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<UserDialogState>({ type: 'closed' })
  const [setupLink, setSetupLink] = useState<SetupLinkState>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
    }, 200)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, role, includeInactive, sort])

  const { users, pagination, isLoading, error, reload } = useUsers({
    search: debouncedSearch,
    role,
    includeInactive,
    sort,
    page,
  })

  const hasActiveQuery =
    debouncedSearch.trim().length > 0 || role !== 'all'

  const closeDialog = () => {
    if (isSubmitting) return
    setDialog({ type: 'closed' })
  }

  const mutationError = (err: unknown, fallback: string, context: string) =>
    toUserFacingErrorMessage(err, {
      fallback,
      context,
      allowSafeApiMessage: true,
    })

  const handleCreateSave = async (values: UserFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createUser({
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        role: values.role,
      })
      setDialog({ type: 'closed' })
      setSetupLink({
        mode: 'create',
        user: result.user,
        setup: result.setup,
      })
      reload()
    } catch (err) {
      const fieldErrors = userFormErrorsFromApi(err)
      if (fieldErrors) return fieldErrors
      toast.error(mutationError(err, 'Unable to create user. Please try again.', 'users-create'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSave = async (values: UserFormValues) => {
    if (dialog.type !== 'edit') return
    const targetId = dialog.user.user_id
    setIsSubmitting(true)
    try {
      await updateUser(targetId, {
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        role: values.role,
        is_active: values.is_active,
      })
      setDialog({ type: 'closed' })
      toast.success('User updated.')
      reload()
    } catch (err) {
      const fieldErrors = userFormErrorsFromApi(err)
      if (fieldErrors) return fieldErrors
      toast.error(mutationError(err, 'Unable to update user. Please try again.', 'users-update'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetConfirm = async () => {
    if (dialog.type !== 'reset') return
    const target = dialog.user
    setIsSubmitting(true)
    try {
      const setup = await resetUserPassword(target.user_id)
      setDialog({ type: 'closed' })
      setSetupLink({
        mode: 'reset',
        user: target,
        setup,
      })
    } catch (err) {
      toast.error(
        mutationError(err, 'Unable to reset password. Please try again.', 'users-reset-password'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDisableConfirm = async () => {
    if (dialog.type !== 'disable') return
    if (currentUserId != null && dialog.user.user_id === currentUserId) {
      toast.error('You cannot deactivate your own account.')
      return
    }
    const target = dialog.user
    setIsSubmitting(true)
    try {
      await updateUser(target.user_id, { is_active: false })
      setDialog({ type: 'closed' })
      toast.success('User set to inactive.')
      reload()
    } catch (err) {
      toast.error(
        mutationError(err, 'Unable to update account status. Please try again.', 'users-disable'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEnableConfirm = async () => {
    if (dialog.type !== 'enable') return
    const target = dialog.user
    setIsSubmitting(true)
    try {
      await updateUser(target.user_id, { is_active: true })
      setDialog({ type: 'closed' })
      toast.success('User set to active.')
      reload()
    } catch (err) {
      toast.error(
        mutationError(err, 'Unable to update account status. Please try again.', 'users-enable'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  let body: ReactNode

  if (isLoading && users.length === 0) {
    body = <UsersTableSkeleton />
  } else if (error) {
    body = (
      <div className="flex min-h-[16rem] items-center justify-center px-4 py-8">
        <EmptyState
          title="Unable to load users"
          description={error}
          action={
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              Try again
            </Button>
          }
        />
      </div>
    )
  } else if (users.length === 0) {
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
          currentUserId={currentUserId ?? -1}
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
        isSubmitting={isSubmitting}
        onCancel={closeDialog}
        onSave={handleCreateSave}
      />

      <UserModal
        open={dialog.type === 'edit'}
        mode="edit"
        initialUser={editUser}
        isSubmitting={isSubmitting}
        disableRoleChange={
          editUser != null &&
          currentUserId != null &&
          editUser.user_id === currentUserId
        }
        onCancel={closeDialog}
        onSave={handleEditSave}
      />

      <ResetPasswordDialog
        open={dialog.type === 'reset'}
        user={confirmUser}
        isSubmitting={isSubmitting}
        onCancel={closeDialog}
        onConfirm={() => void handleResetConfirm()}
      />

      <EnableDisableDialog
        open={dialog.type === 'disable'}
        mode="disable"
        user={confirmUser}
        isSubmitting={isSubmitting}
        onCancel={closeDialog}
        onConfirm={() => void handleDisableConfirm()}
      />

      <EnableDisableDialog
        open={dialog.type === 'enable'}
        mode="enable"
        user={confirmUser}
        isSubmitting={isSubmitting}
        onCancel={closeDialog}
        onConfirm={() => void handleEnableConfirm()}
      />

      <SetupLinkDialog
        open={setupLink != null}
        mode={setupLink?.mode ?? 'create'}
        user={setupLink?.user ?? null}
        token={setupLink?.setup.token ?? null}
        expiresInHours={setupLink?.setup.expiresInHours ?? 48}
        onClose={() => setSetupLink(null)}
      />
    </div>
  )
}
