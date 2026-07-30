import type { ManagedUser } from '@/types/user'

/**
 * Mocked session user for User Management self-action rules (Phase 3).
 * Matches Amina Okafor in MOCK_MANAGED_USERS. Prefer AuthProvider.user when present.
 */
export const MOCK_CURRENT_USER_ID = 1

export function cloneManagedUsers(
  users: readonly ManagedUser[],
): ManagedUser[] {
  return users.map((user) => ({
    ...user,
    roles: [...user.roles],
  }))
}
