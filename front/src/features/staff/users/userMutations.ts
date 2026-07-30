import type { ManagedUser } from '@/types/user'
import type {
  UserFormFieldErrors,
  UserFormValues,
} from '@/features/staff/users/userFormModel'

export type UserMutationSuccess = {
  ok: true
  users: ManagedUser[]
  user: ManagedUser
}

export type UserMutationFailure = {
  ok: false
  errors: UserFormFieldErrors
}

export type UserMutationResult = UserMutationSuccess | UserMutationFailure

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isEmailTaken(
  users: readonly ManagedUser[],
  email: string,
  excludeUserId?: number,
): boolean {
  const normalized = normalizeEmail(email)
  return users.some(
    (user) =>
      user.user_id !== excludeUserId &&
      normalizeEmail(user.email) === normalized,
  )
}

function nextUserId(users: readonly ManagedUser[]): number {
  let maxId = 0
  for (const user of users) {
    if (user.user_id > maxId) maxId = user.user_id
  }
  return maxId + 1
}

/**
 * Pure mock create — swap for POST /users later.
 */
export function createManagedUser(
  users: readonly ManagedUser[],
  values: UserFormValues,
): UserMutationResult {
  if (isEmailTaken(users, values.email)) {
    return {
      ok: false,
      errors: { email: 'An account with this email already exists.' },
    }
  }

  const user: ManagedUser = {
    user_id: nextUserId(users),
    email: normalizeEmail(values.email),
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    is_active: true,
    created_at: new Date().toISOString(),
    roles: [values.role],
  }

  return {
    ok: true,
    user,
    users: [...users, user],
  }
}

/**
 * Pure mock update — swap for PATCH /users/:id later.
 */
export function updateManagedUser(
  users: readonly ManagedUser[],
  userId: number,
  values: UserFormValues,
): UserMutationResult {
  const existing = users.find((user) => user.user_id === userId)
  if (!existing) {
    return {
      ok: false,
      errors: { email: 'User could not be found.' },
    }
  }

  if (isEmailTaken(users, values.email, userId)) {
    return {
      ok: false,
      errors: { email: 'An account with this email already exists.' },
    }
  }

  const user: ManagedUser = {
    ...existing,
    email: normalizeEmail(values.email),
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    is_active: values.is_active,
    roles: [values.role],
  }

  return {
    ok: true,
    user,
    users: users.map((entry) => (entry.user_id === userId ? user : entry)),
  }
}
