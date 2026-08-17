import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  mobilePageTitle,
  PUBLIC_NAV_ITEMS,
} from '@/components/shared/publicNavItems'

describe('public navigation routes', () => {
  it('links Home, Discover, and Contribute to their application routes', () => {
    assert.deepEqual(
      PUBLIC_NAV_ITEMS.map(({ to, label }) => ({ to, label })),
      [
        { to: '/', label: 'Home' },
        { to: '/discover', label: 'Discover Resources' },
        { to: '/submit', label: 'Contribute Resource' },
      ],
    )
  })

  it('maps mobile page titles without retaining /home', () => {
    assert.equal(mobilePageTitle('/'), 'Home')
    assert.equal(mobilePageTitle('/discover'), 'Discover Resources')
    assert.equal(mobilePageTitle('/home'), null)
    assert.equal(mobilePageTitle('/sign-in'), 'Sign In')
    assert.equal(mobilePageTitle('/staff/submissions'), 'Staff Portal')
  })
})
