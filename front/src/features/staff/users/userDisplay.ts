import type { ManagedUser, ManagedUserRole } from '@/types/user'

/**
 * Highest managed role wins when multiple are present
 * (accounts are expected to have exactly one).
 */
const ROLE_PRIORITY: ManagedUserRole[] = [
  'administrator',
  'staff_editor',
  'moderator',
  'trusted_contributor',
]

/** Ascending privilege — used by Create/Edit and filter selects. */
export const MANAGED_USER_ROLE_ORDER: ManagedUserRole[] = [
  'trusted_contributor',
  'moderator',
  'staff_editor',
  'administrator',
]

export type RoleBadgeVariant =
  | 'default'
  | 'primary'
  | 'pending'
  | 'outline'
  | 'success'
  | 'warning'
  | 'danger'

export const ROLE_LABELS: Record<ManagedUserRole, string> = {
  trusted_contributor: 'Contributor',
  moderator: 'Moderator',
  staff_editor: 'Staff Editor',
  administrator: 'Administrator',
}

export function primaryManagedRole(
  roles: readonly string[],
): ManagedUserRole | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null
}

export function roleLabel(role: ManagedUserRole | null): string {
  if (!role) return '—'
  return ROLE_LABELS[role]
}

export function roleBadgeVariant(role: ManagedUserRole | null): RoleBadgeVariant {
  switch (role) {
    case 'administrator':
      return 'primary'
    case 'staff_editor':
      return 'pending'
    case 'moderator':
      return 'outline'
    case 'trusted_contributor':
      return 'default'
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
