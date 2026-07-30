import { useCallback, useMemo, useState } from 'react'
import {
  applyUserListQuery,
  USERS_PAGE_SIZE,
} from '@/services/userService'
import { MOCK_MANAGED_USERS } from '@/features/staff/users/mockUsers'
import { cloneManagedUsers } from '@/features/staff/users/userSession'
import {
  createManagedUser,
  updateManagedUser,
  type UserMutationResult,
} from '@/features/staff/users/userMutations'
import type { UserFormValues } from '@/features/staff/users/userFormModel'
import type { UsersFilters } from '@/hooks/useUsers'
import type { ManagedUser } from '@/types/user'

function filtersKey(filters: UsersFilters): string {
  return JSON.stringify({
    search: filters.search?.trim() ?? '',
    role: filters.role ?? 'all',
    includeInactive: filters.includeInactive ?? false,
    sort: filters.sort ?? 'default',
    page: filters.page ?? 1,
    perPage: filters.perPage ?? USERS_PAGE_SIZE,
  })
}

/**
 * In-memory User Management list with filter/sort/pagination + CRUD mutations.
 * Replace createUser / updateUser / setUserActive bodies with API calls later.
 */
export function useManagedUsers(filters: UsersFilters = {}) {
  const [allUsers, setAllUsers] = useState<ManagedUser[]>(() =>
    cloneManagedUsers(MOCK_MANAGED_USERS),
  )

  const key = filtersKey(filters)

  const result = useMemo(
    () =>
      applyUserListQuery(allUsers, {
        search: filters.search,
        role: filters.role,
        includeInactive: filters.includeInactive,
        sort: filters.sort,
        page: filters.page,
        perPage: filters.perPage ?? USERS_PAGE_SIZE,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by filtersKey
    [allUsers, key],
  )

  const setUserActive = useCallback((userId: number, isActive: boolean) => {
    setAllUsers((current) =>
      current.map((user) =>
        user.user_id === userId ? { ...user, is_active: isActive } : user,
      ),
    )
  }, [])

  const createUser = useCallback((values: UserFormValues): UserMutationResult => {
    let outcome: UserMutationResult | null = null
    setAllUsers((current) => {
      outcome = createManagedUser(current, values)
      return outcome.ok ? outcome.users : current
    })
    return outcome!
  }, [])

  const updateUser = useCallback(
    (userId: number, values: UserFormValues): UserMutationResult => {
      let outcome: UserMutationResult | null = null
      setAllUsers((current) => {
        outcome = updateManagedUser(current, userId, values)
        return outcome.ok ? outcome.users : current
      })
      return outcome!
    },
    [],
  )

  return {
    allUsers,
    users: result.users,
    pagination: result.pagination,
    setUserActive,
    createUser,
    updateUser,
    setAllUsers,
  }
}
