import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PUBLIC_POST_LOGIN_PATH,
  STAFF_POST_LOGIN_PATH,
  resolveAuthenticatedSignInRedirect,
  resolvePostLoginPath,
} from '@/auth/postLoginNavigation'

describe('resolvePostLoginPath', () => {
  it('sends trusted_contributor to Discover', () => {
    assert.equal(
      resolvePostLoginPath(['trusted_contributor'], undefined),
      PUBLIC_POST_LOGIN_PATH,
    )
  })

  it('never sends trusted_contributor to a preserved /staff return path', () => {
    assert.equal(
      resolvePostLoginPath(['trusted_contributor'], {
        from: { pathname: '/staff/submissions', search: '?q=1' },
      }),
      PUBLIC_POST_LOGIN_PATH,
    )
  })

  it('sends moderator, staff_editor, and administrator to Staff Dashboard by default', () => {
    for (const role of ['moderator', 'staff_editor', 'administrator'] as const) {
      assert.equal(resolvePostLoginPath([role], undefined), STAFF_POST_LOGIN_PATH)
    }
  })

  it('returns staff users to a preserved /staff location', () => {
    assert.equal(
      resolvePostLoginPath(['moderator'], {
        from: { pathname: '/staff/users', search: '', hash: '' },
      }),
      '/staff/users',
    )
  })
})

describe('resolveAuthenticatedSignInRedirect', () => {
  it('sends trusted_contributor away from the sign-in page to Discover', () => {
    assert.equal(
      resolveAuthenticatedSignInRedirect(['trusted_contributor']),
      PUBLIC_POST_LOGIN_PATH,
    )
  })

  it('sends staff roles to the Staff Dashboard', () => {
    assert.equal(
      resolveAuthenticatedSignInRedirect(['administrator']),
      STAFF_POST_LOGIN_PATH,
    )
  })
})
