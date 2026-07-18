import type {
  EventContributionData,
  ContributionData,
  EventWeekday,
  RegistrationMode,
} from '@/types/submission'
import {
  createContactMethod,
  createEmptyLocation,
} from '../existingResource/emptyState'

const EVENT_WEEKDAYS: EventWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

function normalizeRecurrenceWeekdays(raw: unknown): EventWeekday[] {
  if (!Array.isArray(raw)) return []
  const found: EventWeekday[] = []
  for (const item of raw) {
    if (
      typeof item === 'string' &&
      (EVENT_WEEKDAYS as string[]).includes(item) &&
      !found.includes(item as EventWeekday)
    ) {
      found.push(item as EventWeekday)
    }
  }
  return found
}

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
    recurrenceWeekdays: [],
    recurrenceEndKind: 'none',
    recurrenceEndDate: '',
    recurrenceOccurrences: '',
    accessMode: null,
    locations: [createEmptyLocation()],
    onlineUrl: '',
    categoryIds: [],
    filterIds: [],
    registrationMode: null,
    contacts: [createContactMethod()],
    costOption: null,
    costDetails: '',
    accessibilityNotes: '',
    eligibility: '',
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

function normalizeRegistrationMode(raw: unknown): RegistrationMode | null {
  if (raw === 'required' || raw === 'not_required' || raw === 'not_sure') {
    return raw
  }
  // Legacy draft values from the previous registration model.
  if (raw === 'none') return 'not_required'
  if (raw === 'optional') return 'not_sure'
  return null
}

export function normalizeEventContributionData(
  data: EventContributionData | Record<string, unknown>,
): EventContributionData {
  const base = createEmptyEventData()
  const raw = data as Partial<EventContributionData> & Record<string, unknown>

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
    recurrenceWeekdays: normalizeRecurrenceWeekdays(raw.recurrenceWeekdays),
    recurrenceEndKind:
      raw.recurrenceEndKind === 'end_date'
        ? 'end_date'
        : raw.recurrenceEndKind === 'occurrences'
          ? 'occurrences'
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
    registrationMode: normalizeRegistrationMode(raw.registrationMode),
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
