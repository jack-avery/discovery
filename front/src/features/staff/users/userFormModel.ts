import type { ManagedUser, ManagedUserRole } from '@/types/user'
import { primaryManagedRole } from '@/features/staff/users/userDisplay'

export type UserModalMode = 'create' | 'edit'

/** Form payload returned by UserModal / UserForm on successful save. */
export interface UserFormValues {
  first_name: string
  last_name: string
  email: string
  role: ManagedUserRole
  /** Always true for create; editable in edit mode. */
  is_active: boolean
}

export interface UserFormFieldErrors {
  first_name?: string
  last_name?: string
  email?: string
  role?: string
}

export type UserFormDraft = {
  first_name: string
  last_name: string
  email: string
  role: ManagedUserRole | ''
  is_active: boolean
}

export function emptyUserFormDraft(): UserFormDraft {
  return {
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    is_active: true,
  }
}

export function userFormDraftFromManagedUser(user: ManagedUser): UserFormDraft {
  return {
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: primaryManagedRole(user.roles) ?? '',
    is_active: user.is_active,
  }
}

function isValidEmailFormat(email: string): boolean {
  // Practical client check — mirrors common “has @ and domain.” rules without over-fitting.
  const trimmed = email.trim()
  if (!trimmed.includes('@')) return false
  const [local, domain] = trimmed.split('@')
  if (!local || !domain) return false
  return domain.includes('.')
}

export function validateUserForm(draft: UserFormDraft): UserFormFieldErrors {
  const errors: UserFormFieldErrors = {}

  if (!draft.first_name.trim()) {
    errors.first_name = 'First name is required.'
  }
  if (!draft.last_name.trim()) {
    errors.last_name = 'Last name is required.'
  }

  const email = draft.email.trim()
  if (!email) {
    errors.email = 'Email is required.'
  } else if (!isValidEmailFormat(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!draft.role) {
    errors.role = 'Role is required.'
  }

  return errors
}

export function hasUserFormErrors(errors: UserFormFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function toUserFormValues(draft: UserFormDraft): UserFormValues | null {
  if (!draft.role) return null
  return {
    first_name: draft.first_name.trim(),
    last_name: draft.last_name.trim(),
    email: draft.email.trim().toLowerCase(),
    role: draft.role,
    is_active: draft.is_active,
  }
}
