/**
 * Auth DTOs matching POST /auth/login and related responses.
 */

export type BackendStaffRole =
  | 'contributor'
  | 'moderator'
  | 'staff_editor'
  | 'administrator'

export interface AuthUser {
  user_id: number
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  created_at: string | null
  roles: string[]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResult {
  access_token: string
  user: AuthUser
}

export interface RefreshResult {
  access_token: string
}

export function displayName(user: AuthUser): string {
  const name = `${user.first_name} ${user.last_name}`.trim()
  return name.length > 0 ? name : user.email
}
