/**
 * Staff User Management DTOs.
 * Frontend ManagedUser is mapped from backend `_user_to_dict` at the service boundary.
 */

export type StaffManageRole = 'administrator' | 'staff_editor' | 'moderator'

/** Client sort keys for the User Management table (current page only). */
export type UserSortField = 'default' | 'name' | 'created_at'

export interface ManagedUser {
  user_id: number
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  created_at: string
  /**
   * Normalized from backend singular `role`.
   * Staff UI displays the highest staff role when present.
   */
  roles: string[]
}

export interface FetchUsersQuery {
  search?: string
  /** `all` or omit = any role. */
  role?: StaffManageRole | 'all'
  /** When false (default), inactive users are excluded via `is_active=true`. */
  includeInactive?: boolean
  sort?: UserSortField
  page?: number
  perPage?: number
}

/** Backend GET/PATCH/POST user payload (`_user_to_dict`). */
export interface BackendManagedUserDto {
  user_id: number
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  created_at: string | null
  role: string | null
}

/** Backend paginated list `data` from GET /users. */
export interface BackendUserListDto {
  items: BackendManagedUserDto[]
  meta: {
    page: number
    per_page: number
    total_items: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

/** Backend create/reset extras (token returned once; never stored on ManagedUser). */
export interface BackendSetupTokenDto {
  setup_token: string
  setup_token_expires_in_hours: number
}

export type BackendCreateUserDto = BackendManagedUserDto & BackendSetupTokenDto

export type BackendResetPasswordDto = {
  user_id: number
} & BackendSetupTokenDto
