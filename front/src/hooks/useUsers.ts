import { useCallback, useState } from 'react'
import { useAbortableQuery } from '@/hooks/useAbortableQuery'
import {
  EMPTY_USER_LIST,
  fetchUsers,
  USERS_PAGE_SIZE,
} from '@/services/userService'
import type {
  FetchUsersQuery,
  StaffManageRole,
  UserSortField,
} from '@/types/user'

export interface UsersFilters {
  search?: string
  role?: StaffManageRole | 'all'
  includeInactive?: boolean
  sort?: UserSortField
  page?: number
  perPage?: number
}

function toQuery(filters: UsersFilters): FetchUsersQuery {
  return {
    search: filters.search,
    role: filters.role,
    includeInactive: filters.includeInactive,
    sort: filters.sort,
    page: filters.page,
    perPage: filters.perPage ?? USERS_PAGE_SIZE,
  }
}

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
 * Staff User Management list — GET /users via userService.
 */
export function useUsers(filters: UsersFilters = {}) {
  const [reloadKey, setReloadKey] = useState(0)
  const query = toQuery(filters)
  const key = filtersKey(filters)

  const { data, isLoading, error } = useAbortableQuery(
    (signal) => fetchUsers(query, { signal }),
    {
      initialData: EMPTY_USER_LIST,
      fallbackErrorMessage: "We couldn't load users. Please try again.",
      deps: [key, reloadKey],
    },
  )

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  return {
    users: data.users,
    pagination: data.pagination,
    isLoading,
    error,
    reload,
  }
}
