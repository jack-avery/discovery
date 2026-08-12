import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  editableFollowUpStatusOptions,
  followUpStatusSelectOptions,
  formatFollowUpLastUpdatedBy,
  isConvertedStatus,
  isFollowUpStatusReadOnly,
  isInternalNotesWithinLimit,
  notesHaveChanged,
  pageAfterStatusFilterChange,
  skillsFollowUpStatusFilterOptions,
} from '@/features/staff/skillsFollowUps/skillsFollowUpStatusHelpers'
import { INTERNAL_NOTES_MAX_LENGTH } from '@/services/skillsFollowUpService'

describe('editable follow-up statuses', () => {
  it('offers Awaiting Contact → Contacted → In Discussion → Closed for immediate PATCH', () => {
    assert.deepEqual(
      editableFollowUpStatusOptions().map((option) => option.value),
      ['accepted', 'contacted', 'in_discussion', 'closed'],
    )
    assert.deepEqual(
      editableFollowUpStatusOptions().map((option) => option.label),
      ['Awaiting Contact', 'Contacted', 'In Discussion', 'Closed'],
    )
  })

  it('does not include Converted in the ordinary status selector options', () => {
    const selectable = editableFollowUpStatusOptions().map(
      (option) => option.value as string,
    )
    assert.equal(selectable.includes('converted'), false)
    assert.equal(
      followUpStatusSelectOptions('accepted').some(
        (option) => option.value === 'converted',
      ),
      false,
    )
    assert.equal(
      followUpStatusSelectOptions('contacted').some(
        (option) => option.value === 'converted',
      ),
      false,
    )
  })

  it('includes Converted in the select only to display an already-converted status', () => {
    const options = followUpStatusSelectOptions('converted')
    assert.equal(
      options.some((option) => option.value === 'converted'),
      true,
    )
    assert.equal(
      options.find((option) => option.value === 'converted')?.label,
      'Converted to Resource',
    )
  })

  it('keeps status controls interactive for converted follow-ups', () => {
    assert.equal(isFollowUpStatusReadOnly('converted'), false)
    assert.equal(isConvertedStatus('converted'), true)
    assert.equal(isConvertedStatus('accepted'), false)
  })
})

describe('status filter options', () => {
  it('includes All plus every backend status including Converted', () => {
    assert.deepEqual(
      skillsFollowUpStatusFilterOptions().map((option) => option.value),
      [
        'all',
        'accepted',
        'contacted',
        'in_discussion',
        'converted',
        'closed',
      ],
    )
  })

  it('uses display labels while keeping backend option values', () => {
    const byValue = Object.fromEntries(
      skillsFollowUpStatusFilterOptions().map((option) => [
        option.value,
        option.label,
      ]),
    )
    assert.equal(byValue.accepted, 'Awaiting Contact')
    assert.equal(byValue.contacted, 'Contacted')
    assert.equal(byValue.in_discussion, 'In Discussion')
    assert.equal(byValue.converted, 'Converted to Resource')
    assert.equal(byValue.closed, 'Closed')
  })

  it('resets pagination to page 1 when the status filter changes', () => {
    assert.equal(pageAfterStatusFilterChange(), 1)
  })
})

describe('internal notes helpers', () => {
  it('detects dirty notes including clearing to empty', () => {
    assert.equal(notesHaveChanged('hello', 'hello'), false)
    assert.equal(notesHaveChanged('hello', null), true)
    assert.equal(notesHaveChanged('', 'saved'), true)
    assert.equal(notesHaveChanged('', null), false)
    assert.equal(notesHaveChanged('', undefined), false)
  })

  it('enforces the 5000-character maximum', () => {
    assert.equal(INTERNAL_NOTES_MAX_LENGTH, 5000)
    assert.equal(isInternalNotesWithinLimit('a'.repeat(5000)), true)
    assert.equal(isInternalNotesWithinLimit('a'.repeat(5001)), false)
  })

  it('formats last-updated metadata only when a display name is present', () => {
    assert.equal(
      formatFollowUpLastUpdatedBy({
        updatedAt: '2026-08-10T20:42:00Z',
        updatedBy: 'Alex Admin',
        formatDate: () => 'Aug 10, 2026, 8:42 p.m.',
      }),
      'Last updated Aug 10, 2026, 8:42 p.m. by Alex Admin',
    )
    assert.equal(
      formatFollowUpLastUpdatedBy({
        updatedAt: '2026-08-10T20:42:00Z',
        updatedBy: null,
        formatDate: () => 'Aug 10, 2026, 8:42 p.m.',
      }),
      null,
    )
  })
})
