import type {
  Contribution,
  ContributorInfo,
  SkillsServicesData,
} from '@/types/submission'
import type { ApprovedResourceVersionPayload } from '@/types/moderationSubmission'
import type { CreateSubmissionRequestDto } from '@/types/submissionApi'
import type { ApprovedVersionSourceFields } from './approvedVersionSource'
import { finalizeApprovedVersionPayload } from './finalizeApprovedVersionPayload'
import { AVAILABILITY_LABELS } from './labels'
import { compactPayload, formatNoteSections, trimText } from './notes'
import {
  joinMessageParts,
  mapSubmitterFields,
  preferredContactMessageLine,
} from './submitter'

/**
 * Temporary backend resource_type — mapper-only, not shown in UI.
 * My Skills or Services → Volunteer Skill (interim strategy).
 */
const TEMP_RESOURCE_TYPE = 'Volunteer Skill' as const

export function mapSkillsServicesContribution(
  contribution: Contribution,
  contributor: ContributorInfo,
): CreateSubmissionRequestDto {
  if (contribution.data.kind !== 'community_asset') {
    throw new Error('Expected community_asset contribution data.')
  }

  const content = mapSkillsVersionContent(contribution.data, {
    name: contribution.title,
    resource_type: TEMP_RESOURCE_TYPE,
  })

  if (!trimText(content.name)) {
    throw new Error('Skills contribution is missing a title.')
  }

  const payload: CreateSubmissionRequestDto = {
    submission_type: 'community_asset',
    ...content,
    ...mapSubmitterFields(contributor),
    submission_message: joinMessageParts([
      preferredContactMessageLine(contributor),
      onBehalfMessage(contribution.data),
    ]),
  }

  return compactPayload(payload)
}

/**
 * Publishable resource/version content for a skills/services form model.
 * Does not include submission, contributor, or moderation fields.
 */
export function mapSkillsVersionContent(
  data: SkillsServicesData,
  source: ApprovedVersionSourceFields = {},
): ApprovedResourceVersionPayload {
  const name = trimText(data.title) || trimText(source.name)
  const whoBenefits = trimText(data.whoBenefits)

  return finalizeApprovedVersionPayload({
    name,
    resource_type: trimText(source.resource_type) || undefined,
    description: trimText(data.description) || undefined,
    eligibility: whoBenefits || undefined,
    general_notes: buildSkillsNotes(data, whoBenefits),
    image_url: trimText(source.image_url) || undefined,
  })
}

function onBehalfMessage(data: SkillsServicesData): string | null {
  if (data.providedPersonally !== 'on_behalf') return null
  const notes = trimText(data.onBehalfOfNotes)
  return notes
    ? `Submitted on someone else's behalf.\nDetails: ${notes}`
    : "Submitted on someone else's behalf."
}

function buildSkillsNotes(
  data: SkillsServicesData,
  whoBenefitsInEligibility: string,
): string | undefined {
  const availabilityLabels = data.availability.map(
    (item) => AVAILABILITY_LABELS[item],
  )
  const availabilityNotes = trimText(data.availabilityNotes)
  const availabilityLines: string[] = []
  if (availabilityLabels.length > 0) {
    availabilityLines.push(availabilityLabels.join(', '))
  }
  if (availabilityNotes) {
    availabilityLines.push(availabilityNotes)
  }

  const languages = data.languages.map((l) => trimText(l)).filter(Boolean)

  // whoBenefits already maps to eligibility — only repeat in notes if useful for staff context
  // when eligibility was empty we wouldn't have it there; if present, skip duplicate section.

  return formatNoteSections([
    {
      heading: 'About the contributor:',
      lines: [trimText(data.aboutYou)],
    },
    {
      heading: 'Why they would like to contribute:',
      lines: [trimText(data.inspiration)],
    },
    {
      heading: 'Who may benefit:',
      lines: whoBenefitsInEligibility ? [] : [trimText(data.whoBenefits)],
    },
    {
      heading: 'Languages:',
      lines: languages.length > 0 ? [languages.join(', ')] : [],
    },
    {
      heading: 'Availability:',
      lines: availabilityLines,
    },
  ])
}
