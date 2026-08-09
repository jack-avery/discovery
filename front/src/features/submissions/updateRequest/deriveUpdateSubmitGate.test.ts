import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  UPDATE_SUBMIT_CONTRIBUTOR_MESSAGE,
  UPDATE_SUBMIT_FIX_RESOURCE_MESSAGE,
  UPDATE_SUBMIT_NO_CHANGES_MESSAGE,
  deriveUpdateSubmitGate,
} from './deriveUpdateSubmitGate'

describe('deriveUpdateSubmitGate', () => {
  it('unchanged valid: Submit disabled + make a change', () => {
    const gate = deriveUpdateSubmitGate({
      hasChanges: false,
      resourceComplete: true,
      contributorComplete: true,
      resourceValidationRevealed: false,
      contributorValidationRevealed: false,
    })
    assert.equal(gate.canSubmit, false)
    assert.equal(gate.footerMessage, UPDATE_SUBMIT_NO_CHANGES_MESSAGE)
  })

  it('changed but invalid before first submit: Submit enabled, no fix message', () => {
    const gate = deriveUpdateSubmitGate({
      hasChanges: true,
      resourceComplete: false,
      contributorComplete: true,
      resourceValidationRevealed: false,
      contributorValidationRevealed: false,
    })
    assert.equal(gate.canSubmit, true)
    assert.equal(gate.footerMessage, null)
  })

  it('after failed submit while invalid: Submit enabled + fix highlighted', () => {
    const gate = deriveUpdateSubmitGate({
      hasChanges: true,
      resourceComplete: false,
      contributorComplete: true,
      resourceValidationRevealed: true,
      contributorValidationRevealed: true,
    })
    assert.equal(gate.canSubmit, true)
    assert.equal(gate.footerMessage, UPDATE_SUBMIT_FIX_RESOURCE_MESSAGE)
  })

  it('phone regression: failed submit then restore equivalent original', () => {
    const afterFail = deriveUpdateSubmitGate({
      hasChanges: true,
      resourceComplete: false,
      contributorComplete: true,
      resourceValidationRevealed: true,
      contributorValidationRevealed: true,
    })
    assert.equal(afterFail.canSubmit, true)
    assert.equal(afterFail.footerMessage, UPDATE_SUBMIT_FIX_RESOURCE_MESSAGE)

    const restored = deriveUpdateSubmitGate({
      hasChanges: false,
      resourceComplete: true,
      contributorComplete: true,
      resourceValidationRevealed: true,
      contributorValidationRevealed: true,
    })
    assert.equal(restored.canSubmit, false)
    assert.equal(restored.footerMessage, UPDATE_SUBMIT_NO_CHANGES_MESSAGE)
  })

  it('genuine valid change after failed validation: ready, no blocking footer', () => {
    const gate = deriveUpdateSubmitGate({
      hasChanges: true,
      resourceComplete: true,
      contributorComplete: true,
      resourceValidationRevealed: true,
      contributorValidationRevealed: true,
    })
    assert.equal(gate.canSubmit, true)
    assert.equal(gate.footerMessage, null)
  })

  it('shows contributor message only after contributor validation revealed', () => {
    const before = deriveUpdateSubmitGate({
      hasChanges: true,
      resourceComplete: true,
      contributorComplete: false,
      resourceValidationRevealed: false,
      contributorValidationRevealed: false,
    })
    assert.equal(before.canSubmit, true)
    assert.equal(before.footerMessage, null)

    const after = deriveUpdateSubmitGate({
      hasChanges: true,
      resourceComplete: true,
      contributorComplete: false,
      resourceValidationRevealed: true,
      contributorValidationRevealed: true,
    })
    assert.equal(after.canSubmit, true)
    assert.equal(after.footerMessage, UPDATE_SUBMIT_CONTRIBUTOR_MESSAGE)
  })
})
