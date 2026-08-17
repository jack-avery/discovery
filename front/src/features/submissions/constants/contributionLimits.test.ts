import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  canAddContribution,
  contributionCountLabel,
  isContributionLimitReached,
  shouldShowContributionCount,
} from './contributionLimits'

describe('contribution limit by authentication state', () => {
  it('shows the count and allows an unauthenticated user below five', () => {
    assert.equal(shouldShowContributionCount(false), true)
    assert.equal(contributionCountLabel(4), '4 of 5 contributions added')
    assert.equal(canAddContribution(4, false), true)
  })

  it('retains the limit for an unauthenticated user at five', () => {
    assert.equal(shouldShowContributionCount(false), true)
    assert.equal(contributionCountLabel(5), '5 of 5 contributions added')
    assert.equal(canAddContribution(5, false), false)
    assert.equal(isContributionLimitReached(5, false), true)
  })

  it('hides the count and allows an authenticated user at any count', () => {
    assert.equal(shouldShowContributionCount(true), false)
    assert.equal(canAddContribution(4, true), true)
    assert.equal(canAddContribution(5, true), true)
    assert.equal(canAddContribution(6, true), true)
    assert.equal(isContributionLimitReached(6, true), false)
  })
})
