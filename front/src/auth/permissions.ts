/**
 * Central permission mapping for the staff experience.
 *
 * UI code should consume {@link StaffPermissions} / {@link permissionsFromRoles}
 * rather than comparing backend role name strings.
 *
 * Intended product mapping (frontend):
 * - moderator: review submissions + Resource Updates
 * - staff_editor: review + edit resources
 * - administrator: all permissions including delete and manage users
 *
 * See Backend Follow-up: staff_editor review permissions are granted here for
 * UI consistency, but the current backend only allows moderator/administrator
 * on submission review endpoints.
 *
 * TODO(update-resource): Rename canReviewUpdateRequests to align with
 * "Resource Update" product terminology when convenient.
 */

export interface StaffPermissions {
  canReviewSubmissions: boolean
  canReviewUpdateRequests: boolean
  canEditResources: boolean
  canDeleteResources: boolean
  canManageUsers: boolean
}

export const EMPTY_PERMISSIONS: StaffPermissions = {
  canReviewSubmissions: false,
  canReviewUpdateRequests: false,
  canEditResources: false,
  canDeleteResources: false,
  canManageUsers: false,
}

const STAFF_ROLES = new Set(['moderator', 'staff_editor', 'administrator'])

/** True when the user has any role intended for the Staff Portal. */
export function hasStaffAccess(roles: readonly string[]): boolean {
  return roles.some((role) => STAFF_ROLES.has(role))
}

export function permissionsFromRoles(roles: readonly string[]): StaffPermissions {
  const roleSet = new Set(roles)
  const isModerator = roleSet.has('moderator')
  const isStaffEditor = roleSet.has('staff_editor')
  const isAdministrator = roleSet.has('administrator')

  return {
    canReviewSubmissions: isModerator || isStaffEditor || isAdministrator,
    canReviewUpdateRequests: isModerator || isStaffEditor || isAdministrator,
    canEditResources: isStaffEditor || isAdministrator,
    canDeleteResources: isAdministrator,
    canManageUsers: isAdministrator,
  }
}
