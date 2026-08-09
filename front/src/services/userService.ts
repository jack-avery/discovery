import { api, ApiError } from '@/services/api'
import type { PaginationMeta } from '@/types/resource'
import type {
  BackendCreateUserDto,
  BackendManagedUserDto,
  BackendResetPasswordDto,
  BackendUserListDto,
  FetchUsersQuery,
  ManagedUser,
  ManagedUserRole,
  UserSortField,
} from '@/types/user'
import type { UserFormFieldErrors } from '@/features/staff/users/userFormModel'

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

export interface FetchUsersOptions {
  signal?: AbortSignal
}

/** One-time password setup credentials returned by create / admin reset. */
export interface SetupCredentials {
  token: string
  expiresInHours: number
}

export interface CreateUserResult {
  user: ManagedUser
  setup: SetupCredentials
}

export interface CreateUserInput {
  email: string
  first_name: string
  last_name: string
  role: ManagedUserRole
}

export interface UpdateUserInput {
  email?: string
  first_name?: string
  last_name?: string
  role?: ManagedUserRole
  is_active?: boolean
}

const MANAGED_USER_ROLES = new Set<string>([
  'trusted_contributor',
  'administrator',
  'staff_editor',
  'moderator',
])

export function isManagedUserRole(role: string): role is ManagedUserRole {
  return MANAGED_USER_ROLES.has(role)
}

/**
 * Map backend `_user_to_dict` into the frontend ManagedUser shape.
 * Singular `role` becomes a one-element `roles` array when present.
 */
export function mapBackendUser(dto: BackendManagedUserDto): ManagedUser {
  return {
    user_id: dto.user_id,
    email: dto.email,
    first_name: dto.first_name,
    last_name: dto.last_name,
    is_active: Boolean(dto.is_active),
    created_at: dto.created_at ?? '',
    roles: dto.role ? [dto.role] : [],
  }
}

export function mapSetupCredentials(dto: {
  setup_token: string
  setup_token_expires_in_hours: number
}): SetupCredentials {
  return {
    token: dto.setup_token,
    expiresInHours: dto.setup_token_expires_in_hours,
  }
}

/**
 * Absolute setup URL for out-of-band sharing.
 * Uses the current origin — never hardcodes a host.
 */
export function buildSetupPasswordUrl(token: string): string {
  const url = new URL('/setup-password', window.location.origin)
  url.searchParams.set('token', token)
  return url.toString()
}

function fullName(user: ManagedUser): string {
  return `${user.first_name} ${user.last_name}`.trim().toLowerCase()
}

/**
 * Sort the currently loaded page only — backend has no sort parameter.
 */
export function sortManagedUsers(
  users: ManagedUser[],
  sort: UserSortField = 'default',
): ManagedUser[] {
  const next = [...users]

  if (sort === 'name') {
    next.sort((left, right) =>
      fullName(left).localeCompare(fullName(right), undefined, {
        sensitivity: 'base',
      }),
    )
    return next
  }

  if (sort === 'created_at') {
    next.sort((left, right) => {
      const leftTime = Date.parse(left.created_at) || 0
      const rightTime = Date.parse(right.created_at) || 0
      if (rightTime !== leftTime) return rightTime - leftTime
      return fullName(left).localeCompare(fullName(right), undefined, {
        sensitivity: 'base',
      })
    })
    return next
  }

  // default: preserve server order (created_at desc), active-first within page
  next.sort((left, right) => {
    if (left.is_active !== right.is_active) {
      return left.is_active ? -1 : 1
    }
    return 0
  })
  return next
}

/**
 * Build GET /users query params from frontend filters.
 */
export function toUsersApiParams(
  query: FetchUsersQuery = {},
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page: query.page ?? 1,
    limit: query.perPage ?? USERS_PAGE_SIZE,
  }

  const search = query.search?.trim()
  if (search) params.search = search

  if (query.role && query.role !== 'all') {
    params.role = query.role
  }

  if (!query.includeInactive) {
    params.is_active = true
  }

  return params
}

/**
 * List staff users — GET /users (administrator).
 */
export async function fetchUsers(
  query: FetchUsersQuery = {},
  options: FetchUsersOptions = {},
): Promise<UserListResult> {
  const data = await api.get<BackendUserListDto>('/users', {
    params: toUsersApiParams(query),
    signal: options.signal,
  })

  const users = sortManagedUsers(
    (data.items ?? []).map(mapBackendUser),
    query.sort ?? 'default',
  )

  return {
    users,
    pagination: data.meta ?? EMPTY_USERS_PAGINATION,
  }
}

/**
 * Create staff account — POST /users.
 * Returns setup credentials once; do not persist the token on the user model.
 */
export async function createUser(
  input: CreateUserInput,
  options: FetchUsersOptions = {},
): Promise<CreateUserResult> {
  const data = await api.post<BackendCreateUserDto>(
    '/users',
    {
      email: input.email.trim().toLowerCase(),
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      role: input.role,
    },
    { signal: options.signal },
  )

  return {
    user: mapBackendUser(data),
    setup: mapSetupCredentials(data),
  }
}

/**
 * Update staff account — PATCH /users/:id.
 */
export async function updateUser(
  userId: number,
  input: UpdateUserInput,
  options: FetchUsersOptions = {},
): Promise<ManagedUser> {
  const body: Record<string, unknown> = {}
  if (input.email !== undefined) {
    body.email = input.email.trim().toLowerCase()
  }
  if (input.first_name !== undefined) {
    body.first_name = input.first_name.trim()
  }
  if (input.last_name !== undefined) {
    body.last_name = input.last_name.trim()
  }
  if (input.role !== undefined) {
    body.role = input.role
  }
  if (input.is_active !== undefined) {
    body.is_active = input.is_active
  }

  const data = await api.patch<BackendManagedUserDto>(`/users/${userId}`, body, {
    signal: options.signal,
  })
  return mapBackendUser(data)
}

/**
 * Issue a fresh one-time setup token — POST /users/:id/reset-password.
 */
export async function resetUserPassword(
  userId: number,
  options: FetchUsersOptions = {},
): Promise<SetupCredentials> {
  const data = await api.post<BackendResetPasswordDto>(
    `/users/${userId}/reset-password`,
    undefined,
    { signal: options.signal },
  )
  return mapSetupCredentials(data)
}

/**
 * Map API failures into UserModal field errors when possible.
 */
export function userFormErrorsFromApi(
  error: unknown,
): UserFormFieldErrors | undefined {
  if (!(error instanceof ApiError)) return undefined

  const out: UserFormFieldErrors = {}
  const fieldErrors = error.errors

  if (fieldErrors) {
    if (fieldErrors.email) out.email = fieldErrors.email
    if (fieldErrors.first_name) out.first_name = fieldErrors.first_name
    if (fieldErrors.last_name) out.last_name = fieldErrors.last_name
    if (fieldErrors.role) out.role = fieldErrors.role
  }

  if (error.status === 409 && !out.email) {
    out.email = 'An account with this email already exists.'
  }

  return Object.keys(out).length > 0 ? out : undefined
}
