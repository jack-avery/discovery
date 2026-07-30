import { ApiError } from '@/services/api'
import type { PaginationMeta } from '@/types/resource'
import type {
  FetchUsersQuery,
  ManagedUser,
  UserSortField,
} from '@/types/user'
import { MOCK_MANAGED_USERS } from '@/features/staff/users/mockUsers'

export const USERS_PAGE_SIZE = 10

export const EMPTY_USERS_PAGINATION: PaginationMeta = {
  page: 1,
  per_page: USERS_PAGE_SIZE,
  total_items: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false,
}

export interface UserListResult {
  users: ManagedUser[]
  pagination: PaginationMeta
}

export const EMPTY_USER_LIST: UserListResult = {
  users: [],
  pagination: EMPTY_USERS_PAGINATION,
}

/**
 * Demo-only scenario flag for Phase 1 UI states.
 * Flip to `'loading' | 'empty' | 'error'` to exercise those views.
 * Keep `'data'` during normal development.
 */
export type MockUsersScenario = 'data' | 'loading' | 'empty' | 'error'

export const MOCK_USERS_SCENARIO: MockUsersScenario = 'data'

export interface FetchUsersOptions {
  signal?: AbortSignal
}

function fullName(user: ManagedUser): string {
  return `${user.first_name} ${user.last_name}`.trim().toLowerCase()
}

function compareBySort(left: ManagedUser, right: ManagedUser, sort: UserSortField): number {
  if (sort === 'name') {
    return fullName(left).localeCompare(fullName(right), undefined, {
      sensitivity: 'base',
    })
  }

  if (sort === 'created_at') {
    const leftTime = Date.parse(left.created_at) || 0
    const rightTime = Date.parse(right.created_at) || 0
    if (rightTime !== leftTime) return rightTime - leftTime
    return fullName(left).localeCompare(fullName(right), undefined, {
      sensitivity: 'base',
    })
  }

  // default: active first, then alphabetical by name
  if (left.is_active !== right.is_active) {
    return left.is_active ? -1 : 1
  }
  return fullName(left).localeCompare(fullName(right), undefined, {
    sensitivity: 'base',
  })
}

function filterUsers(users: ManagedUser[], query: FetchUsersQuery): ManagedUser[] {
  const search = query.search?.trim().toLowerCase() ?? ''
  const role = query.role ?? 'all'
  const includeInactive = query.includeInactive ?? false

  return users.filter((user) => {
    if (!includeInactive && !user.is_active) return false

    if (role !== 'all' && !user.roles.includes(role)) return false

    if (!search) return true

    const haystack = `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase()
    return haystack.includes(search)
  })
}

function paginateUsers(
  users: ManagedUser[],
  page: number,
  perPage: number,
): UserListResult {
  const safePerPage = Math.min(Math.max(perPage, 1), 100)
  const totalItems = users.length
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / safePerPage)
  const safePage = Math.min(Math.max(page, 1), Math.max(totalPages, 1))
  const start = (safePage - 1) * safePerPage

  return {
    users: users.slice(start, start + safePerPage),
    pagination: {
      page: safePage,
      per_page: safePerPage,
      total_items: totalItems,
      total_pages: totalPages,
      has_next: safePage < totalPages,
      has_prev: safePage > 1 && totalPages > 0,
    },
  }
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
}

/**
 * Apply search / role / inactive / sort / pagination to an in-memory user list.
 * Used by Phase 3 React state; later the same shape can wrap API results.
 */
export function applyUserListQuery(
  source: readonly ManagedUser[],
  query: FetchUsersQuery = {},
): UserListResult {
  const sort = query.sort ?? 'default'
  const filtered = filterUsers([...source], query)
  filtered.sort((left, right) => compareBySort(left, right, sort))

  return paginateUsers(
    filtered,
    query.page ?? 1,
    query.perPage ?? USERS_PAGE_SIZE,
  )
}

/**
 * List staff users for User Management.
 *
 * Phase 1–3: filters / sort / pagination run on mock data.
 * Later: swap the body for `api.get('/users', { params, signal })`.
 */
export async function fetchUsers(
  query: FetchUsersQuery = {},
  options: FetchUsersOptions = {},
): Promise<UserListResult> {
  const { signal } = options

  assertNotAborted(signal)

  if (MOCK_USERS_SCENARIO === 'loading') {
    await new Promise<never>((_resolve, reject) => {
      const onAbort = () => {
        reject(new DOMException('Aborted', 'AbortError'))
      }
      if (signal?.aborted) {
        onAbort()
        return
      }
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }

  // Simulate a short network hop so loading skeletons are visible briefly.
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, 350)

    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })

  assertNotAborted(signal)

  if (MOCK_USERS_SCENARIO === 'error') {
    throw new ApiError('Unable to load users. Please try again.', 500)
  }

  const source =
    MOCK_USERS_SCENARIO === 'empty' ? [] : [...MOCK_MANAGED_USERS]

  return applyUserListQuery(source, query)
}
