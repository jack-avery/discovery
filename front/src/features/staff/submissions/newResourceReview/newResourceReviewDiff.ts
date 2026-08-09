import type { ExistingResourceData } from '@/types/submission'
import { normalizeExistingResourceData } from '@/features/submissions/existingResource/emptyState'
import { canonicalizeHours } from '@/features/submissions/hours/hoursEquality'
import { canonicalizeLocations } from '@/features/submissions/locations/locationEquality'
import { canonicalizeLookupIds } from '@/features/submissions/lookups/lookupIdEquality'

export type NewResourceReviewSectionId =
  | 'identity'
  | 'about'
  | 'contact'
  | 'location'
  | 'service'

export const NEW_RESOURCE_REVIEW_SECTIONS: readonly NewResourceReviewSectionId[] =
  ['identity', 'about', 'contact', 'location', 'service']

/**
 * Stable snapshots for section-level dirty detection / reset in new-resource review.
 */
export function getEditedNewResourceSections(
  baseline: ExistingResourceData,
  current: ExistingResourceData,
): NewResourceReviewSectionId[] {
  return NEW_RESOURCE_REVIEW_SECTIONS.filter(
    (sectionId) =>
      stableStringify(sectionSnapshot(baseline, sectionId)) !==
      stableStringify(sectionSnapshot(current, sectionId)),
  )
}

export function hasNewResourceReviewChanges(
  baseline: ExistingResourceData,
  current: ExistingResourceData,
): boolean {
  return getEditedNewResourceSections(baseline, current).length > 0
}

/** Restore one review section from the original proposed snapshot. */
export function resetNewResourceReviewSection(
  current: ExistingResourceData,
  baseline: ExistingResourceData,
  sectionId: NewResourceReviewSectionId,
): ExistingResourceData {
  const next = structuredClone(current)
  switch (sectionId) {
    case 'identity':
      next.name = baseline.name
      next.categoryIds = [...baseline.categoryIds]
      next.filterIds = [...baseline.filterIds]
      break
    case 'about':
      next.description = baseline.description
      next.generalNotes = baseline.generalNotes
      break
    case 'contact':
      next.contacts = structuredClone(baseline.contacts)
      break
    case 'location':
      next.accessMode = baseline.accessMode
      next.locations = structuredClone(baseline.locations)
      next.onlineUrl = baseline.onlineUrl
      break
    case 'service':
      next.hoursAvailability = baseline.hoursAvailability
      next.hours = structuredClone(baseline.hours)
      next.costOption = baseline.costOption
      next.costDetails = baseline.costDetails
      next.accessibilityNotes = baseline.accessibilityNotes
      next.eligibility = baseline.eligibility
      next.moreInfoUrl = baseline.moreInfoUrl
      break
    default: {
      const exhaustive: never = sectionId
      return exhaustive
    }
  }
  return normalizeExistingResourceData(next)
}

function sectionSnapshot(
  data: ExistingResourceData,
  sectionId: NewResourceReviewSectionId,
): unknown {
  switch (sectionId) {
    case 'identity':
      return {
        name: data.name.trim(),
        categoryIds: canonicalizeLookupIds(data.categoryIds),
        filterIds: canonicalizeLookupIds(data.filterIds),
      }
    case 'about':
      return {
        description: data.description.trim(),
        generalNotes: data.generalNotes.trim(),
      }
    case 'contact':
      return normalizeContacts(data.contacts)
    case 'location':
      return {
        accessMode: data.accessMode,
        locations: canonicalizeLocations(data.locations),
        onlineUrl: data.onlineUrl.trim(),
      }
    case 'service':
      return {
        hours: canonicalizeHours({
          hoursAvailability: data.hoursAvailability,
          hours: data.hours,
        }),
        costOption: data.costOption,
        costDetails: data.costDetails.trim(),
        accessibilityNotes: data.accessibilityNotes.trim(),
        eligibility: data.eligibility.trim(),
        moreInfoUrl: data.moreInfoUrl.trim(),
      }
    default: {
      const exhaustive: never = sectionId
      return exhaustive
    }
  }
}

function normalizeContacts(
  contacts: ExistingResourceData['contacts'],
): Array<{ type: string; value: string; label: string }> {
  return contacts
    .map((contact) => ({
      type: contact.type,
      value: contact.value.trim(),
      label: contact.label.trim(),
    }))
    .filter((contact) => contact.value)
    .sort((a, b) =>
      `${a.type}:${a.value}:${a.label}`.localeCompare(
        `${b.type}:${b.value}:${b.label}`,
      ),
    )
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value)
}
