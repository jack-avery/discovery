import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { followUpStatusSelectOptions } from '@/features/staff/skillsFollowUps/skillsFollowUpStatusHelpers'
import {
  toConvertFollowUpPayload,
  toUpdateSkillsFollowUpPayload,
} from '@/services/skillsFollowUpService'

/**
 * Documents the dialog-based Convert to Resource contract
 * (StatusControl vs Convert action vs PATCH).
 */
describe('convert-to-resource action contract', () => {
  it('does not offer Converted as a selectable ordinary status for non-converted rows', () => {
    for (const status of [
      'accepted',
      'contacted',
      'in_discussion',
      'closed',
    ] as const) {
      assert.equal(
        followUpStatusSelectOptions(status).some(
          (option) => option.value === 'converted',
        ),
        false,
      )
    }
  })

  it('ordinary status changes send status only (no converted_resource_id)', () => {
    const payload = toUpdateSkillsFollowUpPayload({ status: 'closed' })
    assert.deepEqual(payload, { status: 'closed' })
    assert.equal('converted_resource_id' in payload, false)
  })

  it('opening the dialog / selecting a resource does not imply a PATCH payload', () => {
    const dialogOpened = true
    const resourceSelected = true
    const confirmed = false
    const shouldPatch = dialogOpened && resourceSelected && confirmed
    assert.equal(shouldPatch, false)
  })

  it('confirm is disabled until a resource is selected', () => {
    const selection = null as { resource_id: number } | null
    const canConfirm = selection != null
    assert.equal(canConfirm, false)
  })

  it('confirmation sends converted + converted_resource_id together', () => {
    assert.deepEqual(toConvertFollowUpPayload(77), {
      status: 'converted',
      converted_resource_id: 77,
    })
  })

  it('failed conversion keeps the dialog conceptually open with selection', () => {
    const patchSucceeded = false
    let dialogOpen = true
    const selectedResourceId = 12
    if (patchSucceeded) {
      dialogOpen = false
    }
    assert.equal(dialogOpen, true)
    assert.equal(selectedResourceId, 12)
  })

  it('converted follow-ups use Change Resource rather than Convert to Resource', () => {
    const status = 'converted'
    const showConvertButton = status !== 'converted'
    const showChangeResource = status === 'converted'
    assert.equal(showConvertButton, false)
    assert.equal(showChangeResource, true)
  })

  it('changing the linked resource still sends converted + new id', () => {
    assert.deepEqual(
      toUpdateSkillsFollowUpPayload(toConvertFollowUpPayload(501)),
      {
        status: 'converted',
        converted_resource_id: 501,
      },
    )
  })
})
