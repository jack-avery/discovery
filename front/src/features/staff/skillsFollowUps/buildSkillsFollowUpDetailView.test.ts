import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildSkillsFollowUpDetailView } from '@/features/staff/skillsFollowUps/buildSkillsFollowUpDetailView'
import type {
  SkillsFollowUpDetailDto,
  SkillsFollowUpSubmissionDetailDto,
} from '@/types/skillsFollowUp'

const FULL_SUBMISSION: SkillsFollowUpSubmissionDetailDto = {
  submitter_name: 'Jamie Skillful',
  submitter_email: 'jamie@example.com',
  submitter_phone: '+16135550100',
  submission_message:
    "Preferred contact method: Email\n\nSubmitted on someone else's behalf.\nDetails: Neighbour Sam",
  skill_description: 'Free resume reviews for neighbours.',
  eligibility_or_availability: 'Newcomers looking for work',
  general_notes: [
    'About the contributor:',
    'HR volunteer with 10 years experience.',
    '',
    'Why they would like to contribute:',
    'Want to help local job seekers.',
    '',
    'Languages:',
    'English, French',
    '',
    'Availability:',
    'Weekdays, Evenings',
    'Best reached after 5pm',
  ].join('\n'),
}

function detail(options?: {
  submission?: Partial<SkillsFollowUpSubmissionDetailDto> | null
  accepted_by?: string | null
}): SkillsFollowUpDetailDto {
  const submission =
    options?.submission === null
      ? null
      : { ...FULL_SUBMISSION, ...(options?.submission ?? {}) }

  return {
    follow_up_id: 42,
    submission_id: 7,
    status: 'accepted',
    internal_notes: 'Staff-only note — must not render',
    accepted_at: '2026-08-01T15:00:00Z',
    accepted_by:
      options && 'accepted_by' in options
        ? (options.accepted_by ?? null)
        : 'Priya Nair',
    updated_at: '2026-08-02T10:00:00Z',
    updated_by: 'Priya Nair',
    converted_resource_id: 99,
    submission,
  }
}

function fieldMap(view: ReturnType<typeof buildSkillsFollowUpDetailView>) {
  const map = new Map<string, string>()
  for (const section of view.sections) {
    for (const field of section.fields) {
      map.set(field.id, field.value)
    }
  }
  return map
}

function sectionIds(view: ReturnType<typeof buildSkillsFollowUpDetailView>) {
  return view.sections.map((section) => section.id)
}

describe('buildSkillsFollowUpDetailView', () => {
  it('displays all populated contributor fields from the detail response', () => {
    const view = buildSkillsFollowUpDetailView(detail())
    const fields = fieldMap(view)

    assert.equal(fields.get('name'), 'Jamie Skillful')
    assert.equal(fields.get('email'), 'jamie@example.com')
    assert.ok(fields.get('phone'))
    assert.equal(fields.get('preferred-contact'), 'Email')
    assert.equal(
      fields.get('description'),
      'Free resume reviews for neighbours.',
    )
    assert.equal(fields.get('who-benefits'), 'Newcomers looking for work')
    assert.equal(fields.get('availability'), 'Weekdays, Evenings')
    assert.equal(fields.get('availability-notes'), 'Best reached after 5pm')
    assert.equal(fields.get('languages'), 'English, French')
    assert.equal(
      fields.get('about-you'),
      'HR volunteer with 10 years experience.',
    )
    assert.equal(fields.get('inspiration'), 'Want to help local job seekers.')
    assert.equal(
      fields.get('connection'),
      "Submitted on someone else's behalf",
    )
    assert.equal(fields.get('on-behalf-details'), 'Neighbour Sam')
    assert.equal(view.acceptedBy, 'Priya Nair')
  })

  it('omits blank, null, and whitespace-only contributor fields', () => {
    const view = buildSkillsFollowUpDetailView(
      detail({
        submission: {
          submitter_name: 'Jamie',
          submitter_email: '  ',
          submitter_phone: null,
          submission_message: null,
          skill_description: 'A description',
          eligibility_or_availability: '',
          general_notes: null,
        },
      }),
    )
    const fields = fieldMap(view)

    assert.equal(fields.get('name'), 'Jamie')
    assert.equal(fields.get('description'), 'A description')
    assert.equal(fields.has('email'), false)
    assert.equal(fields.has('phone'), false)
    assert.equal(fields.has('preferred-contact'), false)
    assert.equal(fields.has('who-benefits'), false)
    assert.equal(fields.has('about-you'), false)
    assert.equal(fields.has('languages'), false)
  })

  it('omits an entire section when all of its fields are blank', () => {
    const view = buildSkillsFollowUpDetailView(
      detail({
        submission: {
          submitter_name: null,
          submitter_email: 'jamie@example.com',
          submitter_phone: null,
          submission_message: null,
          skill_description: null,
          eligibility_or_availability: null,
          general_notes: null,
        },
      }),
    )

    assert.deepEqual(sectionIds(view), ['contact'])
    assert.equal(fieldMap(view).get('email'), 'jamie@example.com')
  })

  it('does not render internal API / staff-only fields', () => {
    const view = buildSkillsFollowUpDetailView(detail())
    const serialized = JSON.stringify(view)

    assert.equal(serialized.includes('Staff-only note'), false)
    assert.equal(serialized.includes('follow_up_id'), false)
    assert.equal(serialized.includes('submission_id'), false)
    assert.equal(serialized.includes('converted_resource_id'), false)
    assert.equal(serialized.includes('updated_by'), false)
    assert.equal(
      view.sections.some((section) =>
        section.fields.some((field) =>
          field.label.toLowerCase().includes('status'),
        ),
      ),
      false,
    )
  })

  it('keeps accepted-by metadata separate from contributor sections', () => {
    const view = buildSkillsFollowUpDetailView(
      detail({
        accepted_by: 'Alex Moderator',
        submission: {
          submitter_name: 'Jamie',
          submitter_email: null,
          submitter_phone: null,
          submission_message: null,
          skill_description: null,
          eligibility_or_availability: null,
          general_notes: null,
        },
      }),
    )

    assert.equal(view.acceptedBy, 'Alex Moderator')
    assert.equal(
      view.sections.some((section) =>
        section.fields.some((field) => field.id === 'accepted-by'),
      ),
      false,
    )
  })

  it('falls back to who-may-benefit from general_notes when eligibility is empty', () => {
    const view = buildSkillsFollowUpDetailView(
      detail({
        submission: {
          submitter_name: null,
          submitter_email: null,
          submitter_phone: null,
          submission_message: null,
          skill_description: null,
          eligibility_or_availability: null,
          general_notes: 'Who may benefit:\nSeniors nearby',
        },
      }),
    )

    assert.equal(fieldMap(view).get('who-benefits'), 'Seniors nearby')
    assert.ok(sectionIds(view).includes('about-offer'))
  })
})
