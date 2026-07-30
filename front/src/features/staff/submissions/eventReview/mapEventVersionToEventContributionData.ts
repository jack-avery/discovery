import type {
  AccessMode,
  EventContributionData,
  EventCostOption,
  EventFrequency,
  EventRelationshipOption,
  EventScheduleKind,
  RecurrenceEndKind,
  RegistrationMode,
  ResourceContactMethod,
  ResourceContactType,
} from '@/types/submission'
import type {
  ResourceContactDto,
  ResourceLocationDto,
  ResourceVersionDto,
} from '@/types/resource'
import {
  createContactMethod,
  createEmptyLocation,
  DEFAULT_CITY,
  DEFAULT_PROVINCE,
} from '@/features/submissions/existingResource/emptyState'
import {
  createEmptyEventData,
  normalizeEventContributionData,
} from '@/features/submissions/event/emptyState'
import {
  ACCESS_MODE_LABELS,
  EVENT_COST_LABELS,
  EVENT_RELATIONSHIP_LABELS,
  FREQUENCY_LABELS,
  REGISTRATION_LABELS,
  SCHEDULE_KIND_LABELS,
} from '@/features/submissions/mappers/labels'
import { parseOccursOnWeekdays } from '@/features/submissions/mappers/eventRecurrence'
import { trimText } from '@/features/submissions/mappers/notes'
import {
  labelledLineValue,
  normalizeNoteHeading,
  parseNoteSections,
} from '@/features/staff/submissions/noteSectionUtils'

/**
 * Prefill the event editor model from a proposed Program version.
 * Best-effort reverse of mapEventContribution note encoding.
 */
export function mapEventVersionToEventContributionData(
  version: ResourceVersionDto,
  submissionMessage?: string | null,
): EventContributionData {
  const sections = parseNoteSections(version.general_notes)
  const scheduleLines = linesForHeading(sections, 'event schedule')
  const registrationLines = linesForHeading(sections, 'registration')
  const accessLines = linesForHeading(sections, 'access')
  const moreInfoLines = linesForHeading(sections, 'more information')
  const additionalLines = linesForHeading(sections, 'additional event details')

  const scheduleKindParsed = parseScheduleKind(
    findLabelledValue(scheduleLines, 'Type'),
  )
  let scheduleKind = scheduleKindParsed
  if (!scheduleKind && scheduleLines.length > 0) {
    if (
      findLabelledValue(scheduleLines, 'First occurrence') ||
      findLabelledValue(scheduleLines, 'Frequency')
    ) {
      scheduleKind = 'recurring'
    } else if (findLabelledValue(scheduleLines, 'Start')) {
      scheduleKind = 'one_time'
    }
  }
  const schedule = parseScheduleFields(scheduleLines, scheduleKind)
  const accessMode = parseAccessMode(accessLines)
  const onlineUrl =
    findLabelledValue(accessLines, 'Online access') ||
    pickWebsiteContact(version.contacts) ||
    ''

  const locations = mapLocations(version.locations)
  const contacts = mapContacts(version.contacts, onlineUrl)
  const { costOption, costDetails } = parseEventCost(version.cost_description)
  const relationship = parseRelationship(submissionMessage)

  const data: EventContributionData = {
    ...createEmptyEventData(),
    name: trimText(version.name) || '',
    description: trimText(version.description) || '',
    scheduleKind,
    ...schedule,
    accessMode,
    locations:
      accessMode === 'online'
        ? locations.length > 0
          ? locations
          : [createEmptyLocation()]
        : locations.length > 0
          ? locations
          : [createEmptyLocation()],
    onlineUrl: trimText(onlineUrl) || '',
    categoryIds: version.categories.map((category) => category.category_id),
    filterIds: version.tags.map((tag) => tag.tag_id),
    registrationMode: parseRegistration(registrationLines),
    contacts: contacts.length > 0 ? contacts : [createContactMethod()],
    costOption,
    costDetails,
    accessibilityNotes: trimText(version.accessibility_notes) || '',
    eligibility: trimText(version.eligibility) || '',
    moreInfoUrl: trimText(moreInfoLines.join('\n')) || '',
    generalNotes: trimText(additionalLines.join('\n')) || '',
    relationship: relationship.relationship,
    relationshipOther: relationship.relationshipOther,
  }

  return normalizeEventContributionData(data)
}

function linesForHeading(
  sections: ReturnType<typeof parseNoteSections>,
  heading: string,
): string[] {
  return sections
    .filter((section) => normalizeNoteHeading(section.heading) === heading)
    .flatMap((section) => section.lines)
}

function findLabelledValue(lines: string[], label: string): string | null {
  for (const line of lines) {
    const value = labelledLineValue(line, label)
    if (value) return value
  }
  return null
}

function parseScheduleKind(raw: string | null): EventScheduleKind | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  for (const [key, label] of Object.entries(SCHEDULE_KIND_LABELS) as Array<
    [EventScheduleKind, string]
  >) {
    if (lower === label.toLowerCase()) return key
  }
  if (lower.includes('recur')) return 'recurring'
  if (lower.includes('one')) return 'one_time'
  return null
}

function parseScheduleFields(
  lines: string[],
  _scheduleKind: EventScheduleKind | null,
): Pick<
  EventContributionData,
  | 'startDate'
  | 'startTime'
  | 'endDate'
  | 'endTime'
  | 'frequency'
  | 'frequencyOther'
  | 'recurrenceWeekdays'
  | 'recurrenceEndKind'
  | 'recurrenceEndDate'
  | 'recurrenceOccurrences'
> {
  const start = splitDateAndTime(findLabelledValue(lines, 'Start'))
  const end = splitDateAndTime(findLabelledValue(lines, 'End'))
  const first = findLabelledValue(lines, 'First occurrence')
  const timeOnly = findLabelledValue(lines, 'Time')
  const endTimeOnly = findLabelledValue(lines, 'End time')
  const frequencyRaw = findLabelledValue(lines, 'Frequency')
  const occursOn = findLabelledValue(lines, 'Occurs on')
  const recurrenceEnd = findLabelledValue(lines, 'Recurrence end')

  let startDate = start.date ? parseDisplayDate(start.date) : ''
  let startTime = start.time ? parseDisplayTime(start.time) : ''
  let endDate = end.date ? parseDisplayDate(end.date) : ''
  let endTime = end.time ? parseDisplayTime(end.time) : ''

  if (!startDate && first) {
    startDate = parseDisplayDate(first)
  }

  if (timeOnly) {
    const range = timeOnly.split(/\s*[–—-]\s*/)
    if (range.length >= 2) {
      startTime = parseDisplayTime(range[0]) || startTime
      endTime = parseDisplayTime(range[1]) || endTime
    } else {
      startTime = parseDisplayTime(timeOnly) || startTime
    }
  }

  if (!endTime && endTimeOnly) {
    endTime = parseDisplayTime(endTimeOnly)
  }

  const { frequency, frequencyOther } = parseFrequency(frequencyRaw)
  const recurrenceWeekdays = parseOccursOnWeekdays(occursOn)
  const recurrence = parseRecurrenceEnd(recurrenceEnd)

  return {
    startDate,
    startTime,
    endDate,
    endTime,
    frequency,
    frequencyOther,
    recurrenceWeekdays,
    recurrenceEndKind: recurrence.kind,
    recurrenceEndDate: recurrence.endDate,
    recurrenceOccurrences: recurrence.occurrences,
  }
}

function parseFrequency(raw: string | null): {
  frequency: EventFrequency | null
  frequencyOther: string
} {
  if (!raw) return { frequency: null, frequencyOther: '' }
  const lower = raw.toLowerCase()
  for (const [key, label] of Object.entries(FREQUENCY_LABELS) as Array<
    [EventFrequency, string]
  >) {
    if (lower === label.toLowerCase()) {
      return { frequency: key, frequencyOther: '' }
    }
  }
  if (lower.includes('two week') || lower === 'bi-weekly' || lower === 'biweekly') {
    return { frequency: 'biweekly', frequencyOther: '' }
  }
  if (lower === 'daily') return { frequency: 'daily', frequencyOther: '' }
  if (lower === 'weekly') return { frequency: 'weekly', frequencyOther: '' }
  if (lower === 'monthly') return { frequency: 'monthly', frequencyOther: '' }
  return { frequency: 'other', frequencyOther: raw }
}

function parseRecurrenceEnd(raw: string | null): {
  kind: RecurrenceEndKind
  endDate: string
  occurrences: string
} {
  if (!raw) return { kind: 'none', endDate: '', occurrences: '' }
  const after = /^after\s+(\d+)\s+occurrences?$/i.exec(raw.trim())
  if (after) {
    return { kind: 'occurrences', endDate: '', occurrences: after[1] }
  }
  const asDate = parseDisplayDate(raw)
  if (asDate) {
    return { kind: 'end_date', endDate: asDate, occurrences: '' }
  }
  return { kind: 'none', endDate: '', occurrences: '' }
}

function parseAccessMode(lines: string[]): AccessMode | null {
  const raw = findLabelledValue(lines, 'Access type')
  if (!raw) return null
  const lower = raw.toLowerCase()
  for (const [key, label] of Object.entries(ACCESS_MODE_LABELS) as Array<
    [AccessMode, string]
  >) {
    if (lower === label.toLowerCase()) return key
  }
  if (lower.includes('both') || lower.includes('physical and online')) {
    return 'both'
  }
  if (lower.includes('online')) return 'online'
  if (lower.includes('physical')) return 'physical'
  return null
}

function parseRegistration(lines: string[]): RegistrationMode | null {
  const text = lines.map(trimText).find(Boolean)
  if (!text) return null
  const first = text.split('\n').map(trimText).find(Boolean) ?? text
  const lower = first.toLowerCase()
  for (const [key, label] of Object.entries(REGISTRATION_LABELS) as Array<
    [RegistrationMode, string]
  >) {
    if (lower === label.toLowerCase()) return key
  }
  if (lower.includes('required') && !lower.includes('not')) return 'required'
  if (lower.includes('not sure')) return 'not_sure'
  if (lower.includes('not required') || lower.includes('optional')) {
    return 'not_required'
  }
  return null
}

function parseEventCost(raw: string | null): {
  costOption: EventCostOption | null
  costDetails: string
} {
  const text = trimText(raw)
  if (!text) return { costOption: null, costDetails: '' }
  const lower = text.toLowerCase()
  for (const [key, label] of Object.entries(EVENT_COST_LABELS) as Array<
    [EventCostOption, string]
  >) {
    if (lower === label.toLowerCase()) {
      return { costOption: key, costDetails: '' }
    }
    if (lower.startsWith(`${label.toLowerCase()}:`)) {
      return {
        costOption: key,
        costDetails: text.slice(label.length + 1).trim(),
      }
    }
  }
  return { costOption: 'other', costDetails: text }
}

function parseRelationship(message: string | null | undefined): {
  relationship: EventRelationshipOption | null
  relationshipOther: string
} {
  const text = trimText(message)
  if (!text) return { relationship: null, relationshipOther: '' }
  for (const line of text.split('\n')) {
    const value = labelledLineValue(line, 'Connection to this event')
    if (!value) continue
    for (const [key, label] of Object.entries(EVENT_RELATIONSHIP_LABELS) as Array<
      [EventRelationshipOption, string]
    >) {
      if (value.toLowerCase() === label.toLowerCase()) {
        return { relationship: key, relationshipOther: '' }
      }
    }
    return { relationship: 'other', relationshipOther: value }
  }
  return { relationship: null, relationshipOther: '' }
}

function splitDateAndTime(value: string | null): {
  date: string | null
  time: string | null
} {
  if (!value) return { date: null, time: null }
  const atMatch = /^(.+?)\s+at\s+(.+)$/i.exec(trimText(value))
  if (atMatch) {
    return {
      date: trimText(atMatch[1]) || null,
      time: trimText(atMatch[2]) || null,
    }
  }
  return { date: trimText(value) || null, time: null }
}

function parseDisplayDate(value: string): string {
  const trimmed = trimText(value)
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const date = new Date(`${trimmed}`)
  if (Number.isNaN(date.getTime())) {
    // Try appending noon to avoid UTC shift issues on date-only parses.
    const mid = new Date(`${trimmed} 12:00:00`)
    if (Number.isNaN(mid.getTime())) return ''
    return toIsoDate(mid)
  }
  return toIsoDate(date)
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDisplayTime(value: string): string {
  const trimmed = trimText(value)
  if (!trimmed) return ''
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(trimmed)
  if (!match) return ''
  let hours = Number(match[1])
  const minutes = match[2]
  const period = match[3]?.toUpperCase()
  if (period === 'PM' && hours < 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return `${String(hours).padStart(2, '0')}:${minutes}`
}

function mapLocations(
  locations: ResourceLocationDto[],
): EventContributionData['locations'] {
  const physical = locations.filter((location) => !location.is_virtual)
  const source = physical.length > 0 ? physical : locations
  return source.map((location) =>
    createEmptyLocation({
      id: `loc-${location.location_id}`,
      locationName: trimText(location.location_name) || '',
      streetAddress: trimText(location.address_line1) || '',
      unit: trimText(location.address_line2) || '',
      city: trimText(location.city) || DEFAULT_CITY,
      province: trimText(location.province) || DEFAULT_PROVINCE,
      postalCode: trimText(location.postal_code) || '',
      lat: location.lat,
      lng: location.lng,
    }),
  )
}

function mapContacts(
  contacts: ResourceContactDto[],
  onlineUrl: string,
): ResourceContactMethod[] {
  const skip = onlineUrl.trim().toLowerCase()
  return contacts
    .filter((contact) => trimText(contact.contact_value))
    .filter((contact) => {
      const type = classifyContactType(contact)
      const value = contact.contact_value.trim().toLowerCase()
      if (type === 'website' && skip && value.includes(skip.replace(/^https?:\/\//, ''))) {
        return false
      }
      return true
    })
    .map((contact) =>
      createContactMethod({
        id: `contact-${contact.contact_id}`,
        type: classifyContactType(contact),
        value: contact.contact_value.trim(),
        label: trimText(contact.contact_label) || '',
      }),
    )
}

function classifyContactType(contact: ResourceContactDto): ResourceContactType {
  const type = contact.contact_type.toLowerCase()
  const value = contact.contact_value.trim()
  if (type.includes('email') || value.includes('@')) return 'email'
  if (type.includes('phone') || type.includes('tel')) return 'phone'
  if (
    type.includes('web') ||
    type.includes('url') ||
    /^https?:\/\//i.test(value)
  ) {
    return 'website'
  }
  return 'other'
}

function pickWebsiteContact(contacts: ResourceContactDto[]): string {
  const websites = contacts.filter(
    (contact) => classifyContactType(contact) === 'website',
  )
  return websites[0]?.contact_value.trim() ?? ''
}
