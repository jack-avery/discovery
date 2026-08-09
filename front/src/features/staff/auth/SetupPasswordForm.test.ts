import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateSetupPasswordFields } from './setupPasswordValidation'

describe('validateSetupPasswordFields', () => {
  it('rejects mismatched passwords', () => {
    const errors = validateSetupPasswordFields('Password1!', 'Password2!')
    assert.equal(errors.confirm, 'Passwords do not match.')
  })

  it('rejects short passwords', () => {
    assert.equal(
      validateSetupPasswordFields('short', 'short').password,
      'Must be at least 8 characters.',
    )
  })

  it('accepts matching passwords of sufficient length', () => {
    assert.deepEqual(
      validateSetupPasswordFields('Password1!', 'Password1!'),
      {},
    )
  })
})
