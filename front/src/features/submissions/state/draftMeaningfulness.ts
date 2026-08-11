import type {
  Contribution,
  ContributorInfo,
  EventContributionData,
  ExistingResourceData,
  SkillsServicesData,
  SubmissionDraft,
} from '@/types/submission'
import { isLocationBlank } from '../existingResource/emptyState'

function hasNonEmptyText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/** Contributor progress worth recovering (name/email/phone/prefs/relationship). */
export function isMeaningfulContributor(contributor: ContributorInfo): boolean {
  return (
    hasNonEmptyText(contributor.name) ||
    hasNonEmptyText(contributor.email) ||
    hasNonEmptyText(contributor.phone) ||
    contributor.preferredContactMethod !== null ||
    contributor.relationship !== null ||
    hasNonEmptyText(contributor.relationshipOther)
  )
}

function isMeaningfulExistingResourceData(
  data: ExistingResourceData,
): boolean {
  if (hasNonEmptyText(data.name)) return true
  if (hasNonEmptyText(data.description)) return true
  if (data.categoryIds.length > 0) return true
  if (data.filterIds.length > 0) return true
  if (data.accessMode !== null) return true
  if (hasNonEmptyText(data.onlineUrl)) return true
  // Default empty state uses contact_for_hours + stock weekday rows.
  if (data.hoursAvailability !== 'contact_for_hours') return true
  if (data.locations.some((location) => !isLocationBlank(location))) return true
  if (
    data.contacts.some(
      (contact) =>
        hasNonEmptyText(contact.value) || hasNonEmptyText(contact.label),
    )
  ) {
    return true
  }
  if (data.costOption !== null) return true
  if (hasNonEmptyText(data.costDetails)) return true
  if (hasNonEmptyText(data.accessibilityNotes)) return true
  if (hasNonEmptyText(data.eligibility)) return true
  if (hasNonEmptyText(data.moreInfoUrl)) return true
  if (hasNonEmptyText(data.generalNotes)) return true
  if (data.relationship !== null) return true
  if (hasNonEmptyText(data.relationshipOther)) return true
  return false
}

function isMeaningfulSkillsServicesData(data: SkillsServicesData): boolean {
  if (hasNonEmptyText(data.title)) return true
  if (hasNonEmptyText(data.description)) return true
  if (hasNonEmptyText(data.whoBenefits)) return true
  if (data.availability.length > 0) return true
  if (hasNonEmptyText(data.availabilityNotes)) return true
  if (data.languages.some((language) => hasNonEmptyText(language))) return true
  if (hasNonEmptyText(data.aboutYou)) return true
  if (hasNonEmptyText(data.inspiration)) return true
  if (data.providedPersonally !== null) return true
  if (hasNonEmptyText(data.onBehalfOfNotes)) return true
  return false
}

function isMeaningfulEventData(data: EventContributionData): boolean {
  if (hasNonEmptyText(data.name)) return true
  if (hasNonEmptyText(data.description)) return true
  if (data.scheduleKind !== null) return true
  if (hasNonEmptyText(data.startDate)) return true
  if (hasNonEmptyText(data.startTime)) return true
  if (hasNonEmptyText(data.endDate)) return true
  if (hasNonEmptyText(data.endTime)) return true
  if (data.frequency !== null) return true
  if (hasNonEmptyText(data.frequencyOther)) return true
  if (data.recurrenceWeekdays.length > 0) return true
  // Empty event defaults to recurrenceEndKind: 'none'.
  if (data.recurrenceEndKind !== 'none') return true
  if (hasNonEmptyText(data.recurrenceEndDate)) return true
  if (hasNonEmptyText(data.recurrenceOccurrences)) return true
  if (data.accessMode !== null) return true
  if (hasNonEmptyText(data.onlineUrl)) return true
  if (data.categoryIds.length > 0) return true
  if (data.filterIds.length > 0) return true
  if (data.registrationMode !== null) return true
  if (data.locations.some((location) => !isLocationBlank(location))) return true
  if (
    data.contacts.some(
      (contact) =>
        hasNonEmptyText(contact.value) || hasNonEmptyText(contact.label),
    )
  ) {
    return true
  }
  if (data.costOption !== null) return true
  if (hasNonEmptyText(data.costDetails)) return true
  if (hasNonEmptyText(data.accessibilityNotes)) return true
  if (hasNonEmptyText(data.eligibility)) return true
  if (hasNonEmptyText(data.moreInfoUrl)) return true
  if (hasNonEmptyText(data.generalNotes)) return true
  if (data.relationship !== null) return true
  if (hasNonEmptyText(data.relationshipOther)) return true
  return false
}

/**
 * True when a contribution contains user-entered data beyond initialized defaults.
 * Title/summary/highlights/status/ids alone do not count — empty editors use
 * placeholder copy without real field progress.
 */
export function isMeaningfulContribution(contribution: Contribution): boolean {
  const { data } = contribution
  if (!data || typeof data !== 'object') return false

  switch (data.kind) {
    case 'existing_resource':
      return isMeaningfulExistingResourceData(data)
    case 'community_asset':
      return isMeaningfulSkillsServicesData(data)
    case 'event':
      return isMeaningfulEventData(data)
    case 'placeholder':
      return false
    default:
      return false
  }
}

/**
 * A draft is recoverable when it has real contribution progress and/or
 * contributor-only progress. Empty defaults, whitespace-only strings, UI-only
 * state, ids, and schema metadata alone are not meaningful.
 */
export function isMeaningfulDraft(draft: SubmissionDraft): boolean {
  if (isMeaningfulContributor(draft.contributor)) return true
  return draft.contributions.some(isMeaningfulContribution)
}
