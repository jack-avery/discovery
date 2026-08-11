import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hasStaffAccess, permissionsFromRoles } from '@/auth/permissions'

describe('permissionsFromRoles — staff workspace vs authentication', () => {
  it('trusted_contributor authenticates but cannot access staff workspace', () => {
    const permissions = permissionsFromRoles(['trusted_contributor'])
    assert.equal(hasStaffAccess(['trusted_contributor']), false)
    assert.equal(permissions.canAccessStaffWorkspace, false)
    assert.equal(permissions.canReviewSubmissions, false)
  })

  it('moderator, staff_editor, and administrator can access staff workspace', () => {
    for (const role of ['moderator', 'staff_editor', 'administrator'] as const) {
      const permissions = permissionsFromRoles([role])
      assert.equal(hasStaffAccess([role]), true)
      assert.equal(permissions.canAccessStaffWorkspace, true)
    }
  })
})

describe('permissionsFromRoles — taxonomy management', () => {
  it('denies category/tag management to moderator', () => {
    const permissions = permissionsFromRoles(['moderator'])
    assert.equal(permissions.canManageCategories, false)
    assert.equal(permissions.canManageTags, false)
    assert.equal(permissions.canEditResources, false)
  })

  it('allows category/tag management for staff_editor and administrator', () => {
    for (const role of ['staff_editor', 'administrator'] as const) {
      const permissions = permissionsFromRoles([role])
      assert.equal(permissions.canManageCategories, true)
      assert.equal(permissions.canManageTags, true)
    }
  })
})
