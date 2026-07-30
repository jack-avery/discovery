import type { ManagedUser, StaffManageRole } from '@/types/user'

/** Highest staff role wins: administrator → staff_editor → moderator. */
const ROLE_PRIORITY: StaffManageRole[] = [
  'administrator',
  'staff_editor',
  'moderator',
]

export type RoleBadgeVariant =
  | 'default'
  | 'primary'
  | 'pending'
  | 'outline'
  | 'success'
  | 'warning'
  | 'danger'

export const ROLE_LABELS: Record<StaffManageRole, string> = {
  administrator: 'Administrator',
  staff_editor: 'Staff Editor',
  moderator: 'Moderator',
}

export function primaryStaffRole(
  roles: readonly string[],
): StaffManageRole | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null
}

export function roleLabel(role: StaffManageRole | null): string {
  if (!role) return '—'
  return ROLE_LABELS[role]
}

export function roleBadgeVariant(role: StaffManageRole | null): RoleBadgeVariant {
  switch (role) {
    case 'administrator':
      return 'primary'
    case 'staff_editor':
      return 'pending'
    case 'moderator':
      return 'outline'
    default:
      return 'default'
  }
}

export function userDisplayName(user: ManagedUser): string {
  const name = `${user.first_name} ${user.last_name}`.trim()
  return name.length > 0 ? name : user.email
}

export function userInitials(user: ManagedUser): string {
  const first = user.first_name.trim().charAt(0)
  const last = user.last_name.trim().charAt(0)
  const initials = `${first}${last}`.toUpperCase()
  return initials || user.email.charAt(0).toUpperCase() || '?'
}

export function formatUserCreatedAt(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
