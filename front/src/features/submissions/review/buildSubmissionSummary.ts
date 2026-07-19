import type {
  Contribution,
  ContributorInfo,
  ExistingResourceData,
  EventContributionData,
  HumanReadableContributionSummary,
  HumanReadableSubmissionSummary,
  SkillsServicesData,
  SubmissionDraft,
} from '@/types/submission'
import { CONTRIBUTION_TYPE_META } from '../constants/contributionTypes'
import { preferredContactLabel } from '../contributor/emptyState'
import { isContributorComplete } from '../contributor/validation'
import { buildAccessSummaryLabel } from '../existingResource/summary'

const RESOURCE_COST_LABELS: Record<
  NonNullable<ExistingResourceData['costOption']>,
  string
> = {
  free: 'Free',
  paid: 'Paid',
  sliding_scale: 'Sliding scale',
  donation: 'Donation',
  not_sure: 'Cost not specified',
  other: 'Other cost',
}

const EVENT_COST_LABELS: Record<
  NonNullable<EventContributionData['costOption']>,
  string
> = {
  free: 'Free',
  free_registration: 'Free with registration',
  paid: 'Paid',
  donation: 'Donation',
  sliding_scale: 'Sliding scale',
  not_sure: 'Cost not specified',
  other: 'Other cost',
}

const AVAILABILITY_LABELS: Record<
  SkillsServicesData['availability'][number],
  string
> = {
  weekdays: 'Weekdays',
  evenings: 'Evenings',
  weekends: 'Weekends',
  flexible: 'Flexible',
}

export type ReviewBlocker =
  | { kind: 'no_contributions'; message: string }
  | { kind: 'incomplete_contribution'; contributionId: string; message: string }
  | { kind: 'incomplete_contributor'; message: string }

/**
 * Build a serializable, human-readable submission summary for review
 * and future PDF / email copy (Milestone 6+). Pure function; not persisted.
 */
export function buildSubmissionSummary(
  draft: SubmissionDraft,
): HumanReadableSubmissionSummary {
  return {
    contributor: {
      name: draft.contributor.name.trim(),
      email: draft.contributor.email.trim(),
      phone: draft.contributor.phone.trim(),
      preferredContactLabel: preferredContactLabel(
        draft.contributor.preferredContactMethod,
      ),
    },
    contributions: draft.contributions.map((contribution) =>
      buildContributionReviewSummary(contribution),
    ),
  }
}

export function buildContributionReviewSummary(
  contribution: Contribution,
): HumanReadableContributionSummary {
  const typeLabel = CONTRIBUTION_TYPE_META[contribution.type].label
  const title = contribution.title.trim() || typeLabel
  const lines = buildReviewLines(contribution)

  return {
    id: contribution.id,
    typeLabel,
    title,
    lines,
  }
}

function buildReviewLines(contribution: Contribution): string[] {
  const data = contribution.data
  const lines: string[] = []

  if (data.kind === 'existing_resource') {
    if (contribution.highlights.length > 0) {
      lines.push(...contribution.highlights.slice(0, 3))
    } else {
      const access = buildAccessSummaryLabel(data)
      if (access) lines.push(access)
    }
    if (data.costOption) {
      const cost =
        data.costOption === 'other' && data.costDetails.trim()
          ? data.costDetails.trim()
          : RESOURCE_COST_LABELS[data.costOption]
      if (cost && !lines.includes(cost)) lines.push(cost)
    }
  } else if (data.kind === 'community_asset') {
    const availability = data.availability.map((a) => AVAILABILITY_LABELS[a])
    if (availability.length > 0) lines.push(availability.join(', '))
    const languages = data.languages.map((l) => l.trim()).filter(Boolean)
    if (languages.length > 0) lines.push(languages.join(' and '))
    if (lines.length === 0 && contribution.summary.trim()) {
      lines.push(contribution.summary.trim())
    }
  } else if (data.kind === 'event') {
    if (contribution.highlights.length > 0) {
      lines.push(...contribution.highlights.slice(0, 3))
    } else if (contribution.summary.trim()) {
      lines.push(...contribution.summary.split(' · ').map((s) => s.trim()))
    }
    if (data.costOption) {
      const cost =
        data.costOption === 'other' && data.costDetails.trim()
          ? data.costDetails.trim()
          : EVENT_COST_LABELS[data.costOption]
      if (cost && !lines.includes(cost)) lines.push(cost)
    }
  } else if (contribution.summary.trim()) {
    lines.push(contribution.summary.trim())
  }

  return lines.filter(Boolean)
}

export function getReviewBlockers(draft: SubmissionDraft): ReviewBlocker[] {
  const blockers: ReviewBlocker[] = []

  if (draft.contributions.length === 0) {
    blockers.push({
      kind: 'no_contributions',
      message: 'Add at least one contribution before reviewing.',
    })
    return blockers
  }

  for (const contribution of draft.contributions) {
    if (contribution.status !== 'complete') {
      blockers.push({
        kind: 'incomplete_contribution',
        contributionId: contribution.id,
        message: `“${contribution.title.trim() || CONTRIBUTION_TYPE_META[contribution.type].label}” still needs attention.`,
      })
    }
  }

  if (
    !isContributorComplete(draft.contributor, {
      requireResourceConnection: draft.contributions.some(
        (contribution) => contribution.data.kind === 'existing_resource',
      ),
    })
  ) {
    blockers.push({
      kind: 'incomplete_contributor',
      message: 'Your contact information still needs to be completed.',
    })
  }

  return blockers
}

export function canOpenReview(draft: SubmissionDraft): boolean {
  return getReviewBlockers(draft).length === 0
}

export function isConsentComplete(consent: boolean): boolean {
  return consent === true
}

export type { ContributorInfo }
