/**
 * Central permission mapping for authenticated platform users.
 *
 * UI code should consume {@link StaffPermissions} / {@link permissionsFromRoles}
 * rather than comparing backend role name strings.
 *
 * Authentication and Staff Workspace access are separate:
 * - Any of the four canonical roles may authenticate
 *   (`trusted_contributor`, `moderator`, `staff_editor`, `administrator`).
 * - Only moderator+ may enter the Staff Workspace (`/staff/*`).
 *
 * Intended product mapping (frontend), aligned with backend `require_roles`
 * hierarchy (`trusted_contributor` < `moderator` < `staff_editor` < `administrator`):
 * - trusted_contributor: public Discover / Contribute; exempt from anonymous
 *   submission rate limits when the API receives their Bearer token
 * - moderator: staff workspace + review submissions / Resource Updates
 * - staff_editor: staff workspace + review + edit resources + manage categories/tags
 * - administrator: all permissions including delete and manage users
 *
 * Dashboard analytics are not a separate permission — anyone who can access
 * the Staff Workspace may load GET /dashboard/stats. The current backend only
 * allows moderator/administrator on that route; staff_editor 403s are handled
 * in the dashboard UI as a temporary backend limitation.
 *
 * TODO(update-resource): Rename canReviewUpdateRequests to align with
 * "Resource Update" product terminology when convenient.
 */

export interface StaffPermissions {
  /**
   * Enter `/staff/*` (moderator+). Trusted contributors authenticate but
   * this remains false.
   */
  canAccessStaffWorkspace: boolean
  canReviewSubmissions: boolean
  canReviewUpdateRequests: boolean
  canEditResources: boolean
  canDeleteResources: boolean
  canManageUsers: boolean
  /** POST/PUT/DELETE /categories — backend `staff_editor+`. */
  canManageCategories: boolean
  /** POST/PUT/DELETE /tags — backend `staff_editor+`. */
  canManageTags: boolean
}

export const EMPTY_PERMISSIONS: StaffPermissions = {
  canAccessStaffWorkspace: false,
  canReviewSubmissions: false,
  canReviewUpdateRequests: false,
  canEditResources: false,
  canDeleteResources: false,
  canManageUsers: false,
  canManageCategories: false,
  canManageTags: false,
}

const STAFF_WORKSPACE_ROLES = new Set([
  'moderator',
  'staff_editor',
  'administrator',
])

/** True when the user may enter the Staff Workspace (`/staff/*`). */
export function hasStaffAccess(roles: readonly string[]): boolean {
  return roles.some((role) => STAFF_WORKSPACE_ROLES.has(role))
}

export function permissionsFromRoles(roles: readonly string[]): StaffPermissions {
  const roleSet = new Set(roles)
  const isModerator = roleSet.has('moderator')
  const isStaffEditor = roleSet.has('staff_editor')
  const isAdministrator = roleSet.has('administrator')
  const canAccessStaffWorkspace =
    isModerator || isStaffEditor || isAdministrator
  const canManageTaxonomy = isStaffEditor || isAdministrator

  return {
    canAccessStaffWorkspace,
    canReviewSubmissions: canAccessStaffWorkspace,
    canReviewUpdateRequests: canAccessStaffWorkspace,
    canEditResources: canManageTaxonomy,
    canDeleteResources: isAdministrator,
    canManageUsers: isAdministrator,
    canManageCategories: canManageTaxonomy,
    canManageTags: canManageTaxonomy,
  }
}
