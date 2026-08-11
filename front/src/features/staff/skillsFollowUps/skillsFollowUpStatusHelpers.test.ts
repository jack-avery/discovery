import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  editableFollowUpStatusOptions,
  formatFollowUpLastUpdatedBy,
  isFollowUpStatusReadOnly,
  isInternalNotesWithinLimit,
  notesHaveChanged,
  pageAfterStatusFilterChange,
  skillsFollowUpStatusFilterOptions,
} from '@/features/staff/skillsFollowUps/skillsFollowUpStatusHelpers'
import { INTERNAL_NOTES_MAX_LENGTH } from '@/services/skillsFollowUpService'

describe('editable follow-up statuses', () => {
  it('offers Accepted → Contacted → In discussion → Closed only', () => {
    assert.deepEqual(
      editableFollowUpStatusOptions().map((option) => option.value),
      ['accepted', 'contacted', 'in_discussion', 'closed'],
    )
  })

  it('does not offer Converted as a selectable status', () => {
    const selectable = editableFollowUpStatusOptions().map(
      (option) => option.value as string,
    )
    assert.equal(selectable.includes('converted'), false)
  })

  it('treats Converted as read-only in the lightweight control', () => {
    assert.equal(isFollowUpStatusReadOnly('converted'), true)
    assert.equal(isFollowUpStatusReadOnly('accepted'), false)
    assert.equal(isFollowUpStatusReadOnly('contacted'), false)
    assert.equal(isFollowUpStatusReadOnly('in_discussion'), false)
    assert.equal(isFollowUpStatusReadOnly('closed'), false)
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
    assert.equal(
      formatFollowUpLastUpdatedBy({
        updatedAt: '2026-08-10T20:42:00Z',
        updatedBy: '   ',
        formatDate: () => 'Aug 10, 2026, 8:42 p.m.',
      }),
      null,
    )
  })
})
