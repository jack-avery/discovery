import type {
  EventContributionData,
  ContributionData,
} from '@/types/submission'
import {
  createContactMethod,
  createEmptyLocation,
} from '../existingResource/emptyState'

export function createEmptyEventData(): EventContributionData {
  return {
    kind: 'event',
    name: '',
    description: '',
    scheduleKind: null,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    frequency: null,
    frequencyOther: '',
    recurrenceEndKind: 'none',
    recurrenceEndDate: '',
    recurrenceOccurrences: '',
    accessMode: null,
    locations: [createEmptyLocation()],
    onlineUrl: '',
    categoryIds: [],
    filterIds: [],
    registrationMode: null,
    registrationDetails: '',
    contacts: [createContactMethod()],
    costOption: null,
    costDetails: '',
    accessibilityNotes: '',
    eligibility: '',
    capacityMode: null,
    capacityLimit: '',
    moreInfoUrl: '',
    generalNotes: '',
    relationship: null,
    relationshipOther: '',
  }
}

export function isEventContributionData(
  data: ContributionData | undefined,
): data is EventContributionData {
  return data?.kind === 'event'
}

export function normalizeEventContributionData(
  data: EventContributionData | Record<string, unknown>,
): EventContributionData {
  const base = createEmptyEventData()
  const raw = data as Partial<EventContributionData>

  return {
    ...base,
    ...raw,
    kind: 'event',
    name: typeof raw.name === 'string' ? raw.name : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    scheduleKind:
      raw.scheduleKind === 'one_time' || raw.scheduleKind === 'recurring'
        ? raw.scheduleKind
        : null,
    startDate: typeof raw.startDate === 'string' ? raw.startDate : '',
    startTime: typeof raw.startTime === 'string' ? raw.startTime : '',
    endDate: typeof raw.endDate === 'string' ? raw.endDate : '',
    endTime: typeof raw.endTime === 'string' ? raw.endTime : '',
    frequency:
      raw.frequency === 'daily' ||
      raw.frequency === 'weekly' ||
      raw.frequency === 'biweekly' ||
      raw.frequency === 'monthly' ||
      raw.frequency === 'other'
        ? raw.frequency
        : null,
    frequencyOther:
      typeof raw.frequencyOther === 'string' ? raw.frequencyOther : '',
    recurrenceEndKind:
      raw.recurrenceEndKind === 'none' ||
      raw.recurrenceEndKind === 'end_date' ||
      raw.recurrenceEndKind === 'occurrences' ||
      raw.recurrenceEndKind === 'not_sure'
        ? raw.recurrenceEndKind
        : 'none',
    recurrenceEndDate:
      typeof raw.recurrenceEndDate === 'string' ? raw.recurrenceEndDate : '',
    recurrenceOccurrences:
      typeof raw.recurrenceOccurrences === 'string'
        ? raw.recurrenceOccurrences
        : '',
    accessMode:
      raw.accessMode === 'physical' ||
      raw.accessMode === 'online' ||
      raw.accessMode === 'both'
        ? raw.accessMode
        : null,
    locations:
      Array.isArray(raw.locations) && raw.locations.length > 0
        ? raw.locations.map((loc) => createEmptyLocation(loc))
        : [createEmptyLocation()],
    onlineUrl: typeof raw.onlineUrl === 'string' ? raw.onlineUrl : '',
    categoryIds: Array.isArray(raw.categoryIds) ? raw.categoryIds : [],
    filterIds: Array.isArray(raw.filterIds) ? raw.filterIds : [],
    registrationMode:
      raw.registrationMode === 'none' ||
      raw.registrationMode === 'required' ||
      raw.registrationMode === 'optional' ||
      raw.registrationMode === 'not_sure'
        ? raw.registrationMode
        : null,
    registrationDetails:
      typeof raw.registrationDetails === 'string'
        ? raw.registrationDetails
        : '',
    contacts:
      Array.isArray(raw.contacts) && raw.contacts.length > 0
        ? raw.contacts
        : [createContactMethod()],
    costOption:
      raw.costOption === 'free' ||
      raw.costOption === 'free_registration' ||
      raw.costOption === 'paid' ||
      raw.costOption === 'donation' ||
      raw.costOption === 'sliding_scale' ||
      raw.costOption === 'not_sure' ||
      raw.costOption === 'other'
        ? raw.costOption
        : null,
    costDetails: typeof raw.costDetails === 'string' ? raw.costDetails : '',
    accessibilityNotes:
      typeof raw.accessibilityNotes === 'string' ? raw.accessibilityNotes : '',
    eligibility: typeof raw.eligibility === 'string' ? raw.eligibility : '',
    capacityMode:
      raw.capacityMode === 'limited' || raw.capacityMode === 'not_sure'
        ? raw.capacityMode
        : null,
    capacityLimit:
      typeof raw.capacityLimit === 'string' ? raw.capacityLimit : '',
    moreInfoUrl: typeof raw.moreInfoUrl === 'string' ? raw.moreInfoUrl : '',
    generalNotes: typeof raw.generalNotes === 'string' ? raw.generalNotes : '',
    relationship:
      raw.relationship === 'organizing' ||
      raw.relationship === 'represent_host' ||
      raw.relationship === 'volunteer' ||
      raw.relationship === 'public_info' ||
      raw.relationship === 'someone_told_me' ||
      raw.relationship === 'other'
        ? raw.relationship
        : null,
    relationshipOther:
      typeof raw.relationshipOther === 'string' ? raw.relationshipOther : '',
  }
}
