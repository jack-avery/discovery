/**
 * Staff User Management DTOs.
 * Shaped to mirror AuthUser / future GET /users list items.
 */

export type StaffManageRole = 'administrator' | 'staff_editor' | 'moderator'

/** Client sort keys for the User Management table. */
export type UserSortField = 'default' | 'name' | 'created_at'

export interface ManagedUser {
  user_id: number
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  created_at: string
  /** Backend may return multiple; staff UI shows the highest staff role. */
  roles: StaffManageRole[]
}

export interface FetchUsersQuery {
  search?: string
  /** `all` or omit = any role. */
  role?: StaffManageRole | 'all'
  /** When false (default), inactive users are excluded. */
  includeInactive?: boolean
  sort?: UserSortField
  page?: number
  perPage?: number
}
