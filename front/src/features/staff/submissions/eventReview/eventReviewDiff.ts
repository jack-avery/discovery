import type { EventContributionData } from '@/types/submission'
import { normalizeEventContributionData } from '@/features/submissions/event/emptyState'

export type EventReviewSectionId =
  | 'about'
  | 'schedule'
  | 'location'
  | 'discover'
  | 'attendance'
  | 'details'

export const EVENT_REVIEW_SECTIONS: readonly EventReviewSectionId[] = [
  'about',
  'schedule',
  'location',
  'discover',
  'attendance',
  'details',
]

export function getEditedEventSections(
  baseline: EventContributionData,
  current: EventContributionData,
): EventReviewSectionId[] {
  return EVENT_REVIEW_SECTIONS.filter(
    (sectionId) =>
      JSON.stringify(sectionSnapshot(baseline, sectionId)) !==
      JSON.stringify(sectionSnapshot(current, sectionId)),
  )
}

export function hasEventReviewChanges(
  baseline: EventContributionData,
  current: EventContributionData,
): boolean {
  return getEditedEventSections(baseline, current).length > 0
}

export function resetEventReviewSection(
  current: EventContributionData,
  baseline: EventContributionData,
  sectionId: EventReviewSectionId,
): EventContributionData {
  const next = structuredClone(current)
  const snap = sectionSnapshot(baseline, sectionId)
  Object.assign(next, snap)
  return normalizeEventContributionData(next)
}

function sectionSnapshot(
  data: EventContributionData,
  sectionId: EventReviewSectionId,
): Partial<EventContributionData> {
  switch (sectionId) {
    case 'about':
      return {
        name: data.name,
        description: data.description,
      }
    case 'schedule':
      return {
        scheduleKind: data.scheduleKind,
        startDate: data.startDate,
        startTime: data.startTime,
        endDate: data.endDate,
        endTime: data.endTime,
        frequency: data.frequency,
        frequencyOther: data.frequencyOther,
        recurrenceWeekdays: [...data.recurrenceWeekdays],
        recurrenceEndKind: data.recurrenceEndKind,
        recurrenceEndDate: data.recurrenceEndDate,
        recurrenceOccurrences: data.recurrenceOccurrences,
      }
    case 'location':
      return {
        accessMode: data.accessMode,
        locations: structuredClone(data.locations),
        onlineUrl: data.onlineUrl,
      }
    case 'discover':
      return {
        categoryIds: [...data.categoryIds],
        filterIds: [...data.filterIds],
      }
    case 'attendance':
      return {
        registrationMode: data.registrationMode,
        contacts: structuredClone(data.contacts),
      }
    case 'details':
      return {
        costOption: data.costOption,
        costDetails: data.costDetails,
        accessibilityNotes: data.accessibilityNotes,
        eligibility: data.eligibility,
        moreInfoUrl: data.moreInfoUrl,
        generalNotes: data.generalNotes,
        relationship: data.relationship,
        relationshipOther: data.relationshipOther,
      }
    default: {
      const exhaustive: never = sectionId
      return exhaustive
    }
  }
}
