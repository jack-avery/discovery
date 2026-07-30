import { Badge } from '@/components/ui'
import type { ManagedUser } from '@/types/user'
import { UserActionsMenu } from '@/features/staff/users/UserActionsMenu'
import {
  formatUserCreatedAt,
  primaryStaffRole,
  roleBadgeVariant,
  roleLabel,
  userDisplayName,
  userInitials,
} from '@/features/staff/users/userDisplay'
import {
  usersTableBodyCellClass,
  usersTableHeaderCellClass,
} from '@/features/staff/users/usersTableStyles'
import { cn } from '@/utils/cn'

interface UsersTableProps {
  users: ManagedUser[]
  currentUserId: number
  onEdit: (user: ManagedUser) => void
  onResetPassword: (user: ManagedUser) => void
  onDisable: (user: ManagedUser) => void
  onEnable: (user: ManagedUser) => void
}

/**
 * Admin user table with per-row actions menu.
 */
export function UsersTable({
  users,
  currentUserId,
  onEdit,
  onResetPassword,
  onDisable,
  onEnable,
}: UsersTableProps) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th scope="col" className={usersTableHeaderCellClass}>
              User
            </th>
            <th scope="col" className={usersTableHeaderCellClass}>
              Email
            </th>
            <th scope="col" className={usersTableHeaderCellClass}>
              Role
            </th>
            <th scope="col" className={usersTableHeaderCellClass}>
              Status
            </th>
            <th scope="col" className={usersTableHeaderCellClass}>
              Created
            </th>
            <th
              scope="col"
              className={cn(usersTableHeaderCellClass, 'w-14 text-right')}
            >
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const role = primaryStaffRole(user.roles)
            const name = userDisplayName(user)

            return (
              <tr
                key={user.user_id}
                className="border-b border-border last:border-b-0 hover:bg-muted/30"
              >
                <td className={usersTableBodyCellClass}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-interactive-muted font-heading text-xs font-semibold text-interactive"
                      aria-hidden="true"
                    >
                      {userInitials(user)}
                    </span>
                    <span className="truncate font-medium text-foreground">
                      {name}
                    </span>
                  </div>
                </td>
                <td
                  className={cn(
                    usersTableBodyCellClass,
                    'text-muted-foreground',
                  )}
                >
                  <span className="truncate">{user.email}</span>
                </td>
                <td className={usersTableBodyCellClass}>
                  <Badge variant={roleBadgeVariant(role)}>
                    {roleLabel(role)}
                  </Badge>
                </td>
                <td className={usersTableBodyCellClass}>
                  <Badge variant={user.is_active ? 'success' : 'default'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td
                  className={cn(
                    usersTableBodyCellClass,
                    'whitespace-nowrap text-muted-foreground',
                  )}
                >
                  {formatUserCreatedAt(user.created_at)}
                </td>
                <td className={cn(usersTableBodyCellClass, 'text-right')}>
                  <UserActionsMenu
                    user={user}
                    isCurrentUser={user.user_id === currentUserId}
                    onEdit={() => onEdit(user)}
                    onResetPassword={() => onResetPassword(user)}
                    onDisable={() => onDisable(user)}
                    onEnable={() => onEnable(user)}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
