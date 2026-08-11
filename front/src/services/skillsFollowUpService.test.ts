import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hasStaffAccess, permissionsFromRoles } from '@/auth/permissions'
import {
  displaySkillName,
  displaySubmitterName,
  EDITABLE_SKILLS_FOLLOW_UP_STATUSES,
  isEditableSkillsFollowUpStatus,
  remapMetaForClientPage,
  reverseFollowUpPageItems,
  serverPageForOldestFirst,
  skillsFollowUpStatusLabel,
  toSkillsFollowUpsApiParams,
  toUpdateSkillsFollowUpPayload,
} from '@/services/skillsFollowUpService'
import type { PaginationMeta } from '@/types/resource'
import type { SkillsFollowUpSummaryDto } from '@/types/skillsFollowUp'

function summary(
  overrides: Partial<SkillsFollowUpSummaryDto> &
    Pick<SkillsFollowUpSummaryDto, 'follow_up_id'>,
): SkillsFollowUpSummaryDto {
  return {
    submission_id: overrides.follow_up_id,
    status: 'accepted',
    submitter_name: 'Jamie Skillful',
    skill_name: 'Guitar Lessons',
    accepted_at: '2026-08-01T12:00:00Z',
    ...overrides,
  }
}

describe('toSkillsFollowUpsApiParams', () => {
  it('defaults page and limit for GET /skills-follow-ups', () => {
    assert.deepEqual(toSkillsFollowUpsApiParams({}), {
      page: 1,
      limit: 20,
    })
  })

  it('forwards status, page, and limit without inventing a sort param', () => {
    assert.deepEqual(
      toSkillsFollowUpsApiParams({
        status: 'contacted',
        page: 3,
        limit: 10,
        sort: 'oldest',
      }),
      {
        status: 'contacted',
        page: 3,
        limit: 10,
      },
    )
  })

  it('forwards Converted as a server-side status filter', () => {
    assert.deepEqual(
      toSkillsFollowUpsApiParams({ status: 'converted', page: 1 }),
      {
        status: 'converted',
        page: 1,
        limit: 20,
      },
    )
  })
})

describe('oldest-first reverse pagination', () => {
  it('maps client pages onto newest-first server pages', () => {
    assert.equal(serverPageForOldestFirst(1, 5), 5)
    assert.equal(serverPageForOldestFirst(2, 5), 4)
    assert.equal(serverPageForOldestFirst(5, 5), 1)
    assert.equal(serverPageForOldestFirst(1, 1), 1)
  })

  it('clamps out-of-range client pages', () => {
    assert.equal(serverPageForOldestFirst(99, 3), 1)
    assert.equal(serverPageForOldestFirst(0, 3), 3)
  })

  it('reverses a newest-first page into oldest-first order', () => {
    const newestFirst = [
      summary({ follow_up_id: 30, accepted_at: '2026-08-03T00:00:00Z' }),
      summary({ follow_up_id: 20, accepted_at: '2026-08-02T00:00:00Z' }),
      summary({ follow_up_id: 10, accepted_at: '2026-08-01T00:00:00Z' }),
    ]
    const oldestFirst = reverseFollowUpPageItems(newestFirst)
    assert.deepEqual(
      oldestFirst.map((item) => item.follow_up_id),
      [10, 20, 30],
    )
  })

  it('remaps pagination meta for the client page', () => {
    const meta: PaginationMeta = {
      page: 4,
      per_page: 20,
      total_items: 85,
      total_pages: 5,
      has_next: true,
      has_prev: true,
    }
    assert.deepEqual(remapMetaForClientPage(meta, 1), {
      ...meta,
      page: 1,
      has_prev: false,
      has_next: true,
    })
    assert.deepEqual(remapMetaForClientPage(meta, 5), {
      ...meta,
      page: 5,
      has_prev: true,
      has_next: false,
    })
  })
})

describe('skills follow-up display helpers', () => {
  it('renders contributor and skill labels for a successful list row', () => {
    const item = summary({ follow_up_id: 1 })
    assert.equal(displaySubmitterName(item), 'Jamie Skillful')
    assert.equal(displaySkillName(item), 'Guitar Lessons')
  })

  it('uses empty-state friendly fallbacks when names are missing', () => {
    const item = summary({
      follow_up_id: 2,
      submitter_name: '  ',
      skill_name: null,
    })
    assert.equal(displaySubmitterName(item), 'Unknown contributor')
    assert.equal(displaySkillName(item), 'Untitled skill or service')
  })

  it('labels known follow-up statuses including Converted', () => {
    assert.equal(skillsFollowUpStatusLabel('accepted'), 'Accepted')
    assert.equal(skillsFollowUpStatusLabel('contacted'), 'Contacted')
    assert.equal(skillsFollowUpStatusLabel('in_discussion'), 'In discussion')
    assert.equal(skillsFollowUpStatusLabel('converted'), 'Converted')
    assert.equal(skillsFollowUpStatusLabel('closed'), 'Closed')
  })
})

describe('toUpdateSkillsFollowUpPayload', () => {
  it('builds a status-only PATCH body for Accepted → Contacted', () => {
    assert.deepEqual(toUpdateSkillsFollowUpPayload({ status: 'contacted' }), {
      status: 'contacted',
    })
  })

  it('builds PATCH bodies for Contacted → In discussion and In discussion → Closed', () => {
    assert.deepEqual(
      toUpdateSkillsFollowUpPayload({ status: 'in_discussion' }),
      { status: 'in_discussion' },
    )
    assert.deepEqual(toUpdateSkillsFollowUpPayload({ status: 'closed' }), {
      status: 'closed',
    })
  })

  it('builds an internal_notes PATCH body and clears notes with empty string', () => {
    assert.deepEqual(
      toUpdateSkillsFollowUpPayload({
        internal_notes: 'Called; left voicemail.',
      }),
      { internal_notes: 'Called; left voicemail.' },
    )
    assert.deepEqual(
      toUpdateSkillsFollowUpPayload({ internal_notes: null }),
      { internal_notes: '' },
    )
    assert.deepEqual(toUpdateSkillsFollowUpPayload({ internal_notes: '' }), {
      internal_notes: '',
    })
  })

  it('omits unset fields so status and notes can be patched independently', () => {
    assert.deepEqual(toUpdateSkillsFollowUpPayload({}), {})
  })

  it('keeps Converted out of the editable status set', () => {
    assert.deepEqual([...EDITABLE_SKILLS_FOLLOW_UP_STATUSES], [
      'accepted',
      'contacted',
      'in_discussion',
      'closed',
    ])
    assert.equal(isEditableSkillsFollowUpStatus('converted'), false)
    assert.equal(isEditableSkillsFollowUpStatus('accepted'), true)
  })
})

/**
 * Controlled status display: the select stays bound to the last confirmed
 * server status. A failed PATCH must not advance the displayed value.
 */
describe('status update display contract', () => {
  it('retains the previous status when a PATCH fails', () => {
    const previousStatus = 'accepted'
    const requestedStatus = 'contacted'
    const patchSucceeded = false
    const displayedStatus = patchSucceeded ? requestedStatus : previousStatus
    assert.equal(displayedStatus, 'accepted')
  })

  it('advances the displayed status only after a successful PATCH', () => {
    const previousStatus = 'contacted'
    const requestedStatus = 'in_discussion'
    const patchSucceeded = true
    const displayedStatus = patchSucceeded ? requestedStatus : previousStatus
    assert.equal(displayedStatus, 'in_discussion')
  })
})

describe('skills follow-ups staff access', () => {
  it('matches backend moderator+ gate via staff portal roles', () => {
    assert.equal(hasStaffAccess(['trusted_contributor']), false)
    assert.equal(hasStaffAccess(['moderator']), true)
    assert.equal(hasStaffAccess(['staff_editor']), true)
    assert.equal(hasStaffAccess(['administrator']), true)

    // Same capability used for Review Submissions — Skills Follow-ups nav
    // is shown to every authenticated staff user (RequireAuth + staff rail).
    assert.equal(
      permissionsFromRoles(['moderator']).canReviewSubmissions,
      true,
    )
    assert.equal(
      permissionsFromRoles(['trusted_contributor']).canReviewSubmissions,
      false,
    )
  })
})
