/**
 * Auth DTOs matching POST /auth/login, GET /auth/me, and related responses.
 */

export type BackendStaffRole =
  | 'trusted_contributor'
  | 'moderator'
  | 'staff_editor'
  | 'administrator'

/** User payload from login and GET /auth/me (`user.to_dict(include_roles=True)`). */
export interface AuthUser {
  user_id: number
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  created_at: string | null
  /** Role name strings (e.g. administrator). Permissions are derived client-side. */
  roles: string[]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResult {
  access_token: string
  /** Present on login; prefer GET /auth/me as the session user source of truth. */
  user: AuthUser
}

/** Unwrapped `data` from GET /auth/me. */
export interface MeResult {
  user: AuthUser
}

export interface RefreshResult {
  access_token: string
}

export function displayName(user: AuthUser): string {
  const name = `${user.first_name} ${user.last_name}`.trim()
  return name.length > 0 ? name : user.email
}
