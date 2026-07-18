import type { ResourceVersionDto } from '@/types/resource'
import type { BackendSubmissionType } from '@/types/submissionApi'
import type { NoteSection } from '@/features/submissions/mappers/notes'
import { formatNoteSections, trimText } from '@/features/submissions/mappers/notes'
import {
  formatRecurrenceFromNotes,
  isConcreteRecurrenceEndDate,
} from '@/features/submissions/mappers/eventRecurrence'
import {
  applyLocationDetailNotes,
  ensureContactsFromNotes,
  extractNonUrlLines,
  extractOnlineAccessUrl,
  labelledLineValue,
  meaningfulAccessModeLabel,
  normalizeNoteHeading,
  parseNoteSections,
} from '@/features/staff/submissions/noteSectionUtils'

/**
 * Structured event fields for {@link EventDetailPresentation}.
 * Parsed from labelled `general_notes` written by the public event mapper —
 * not a new API contract.
 */
export interface EventDetailField {
  label: string
  value: string
  /**
   * When false, omit from public presentation (e.g. Registration: Not sure).
   * Moderator review always shows the field.
   */
  includeInPublic?: boolean
}

export interface EventVersionPresentation {
  version: ResourceVersionDto
  /** Structured rows for the Event Details card (omit empty). */
  eventDetails: EventDetailField[]
  /** True when access is online-only (no physical venues). */
  isOnlineOnly: boolean
  /**
   * Access mode label when it adds meaning (Online / hybrid).
   * Redundant "Physical location" is suppressed.
   */
  accessModeLabel: string | null
  /** Labelled online-access URL for the Location card. */
  onlineAccessUrl: string | null
}

const LOCATION_HEADINGS = new Set(['additional location details'])
const ACCESS_HEADINGS = new Set(['access'])
const MORE_INFO_HEADINGS = new Set(['more information'])
const SCHEDULE_HEADINGS = new Set(['event schedule'])
const REGISTRATION_HEADINGS = new Set(['registration'])
/** Capacity is retired — discard legacy note blocks. */
const CAPACITY_HEADINGS = new Set(['capacity'])
const ABOUT_HEADINGS = new Set(['additional event details', 'additional details'])

/**
 * Detect event contributions without changing backend contracts.
 * Public event mapper writes an "Event schedule:" notes block and uses
 * interim resource_type "Program".
 */
export function isEventProposedVersion(version: ResourceVersionDto): boolean {
  const sections = parseNoteSections(version.general_notes)
  if (
    sections.some((section) =>
      SCHEDULE_HEADINGS.has(normalizeNoteHeading(section.heading)),
    )
  ) {
    return true
  }
  return version.resource_type === 'Program'
}

export function resolveContributionPresentationKind(
  version: ResourceVersionDto,
  submissionType: BackendSubmissionType,
): 'resource' | 'event' | 'skill' {
  if (submissionType === 'community_asset') return 'skill'
  if (isEventProposedVersion(version)) return 'event'
  return 'resource'
}

/**
 * Map a proposed event version into a presentation model for EventDetailPresentation.
 */
export function mapEventVersionForPresentation(
  version: ResourceVersionDto,
): EventVersionPresentation {
  const sections = parseNoteSections(version.general_notes)

  const aboutSections: NoteSection[] = []
  const locationSections: NoteSection[] = []
  const accessSections: NoteSection[] = []
  const moreInfoSections: NoteSection[] = []
  const scheduleSections: NoteSection[] = []
  const registrationSections: NoteSection[] = []

  for (const section of sections) {
    const key = normalizeNoteHeading(section.heading)
    if (SCHEDULE_HEADINGS.has(key)) {
      scheduleSections.push(section)
    } else if (REGISTRATION_HEADINGS.has(key)) {
      registrationSections.push(section)
    } else if (CAPACITY_HEADINGS.has(key)) {
      // Capacity removed from the product — ignore legacy note blocks.
      continue
    } else if (LOCATION_HEADINGS.has(key)) {
      locationSections.push(section)
    } else if (ACCESS_HEADINGS.has(key)) {
      accessSections.push(section)
    } else if (MORE_INFO_HEADINGS.has(key)) {
      moreInfoSections.push(section)
    } else if (!section.heading || ABOUT_HEADINGS.has(key)) {
      aboutSections.push(section)
    } else {
      // Unknown narrative — keep in About, never as raw schedule labels.
      aboutSections.push(section)
    }
  }

  let locations = version.locations.map((location) => ({ ...location }))
  locations = applyLocationDetailNotes(locations, locationSections)

  let contacts = version.contacts.map((contact) => ({ ...contact }))
  contacts = ensureContactsFromNotes(contacts, [
    ...accessSections,
    ...moreInfoSections,
  ])

  const accessModeLabel = meaningfulAccessModeLabel(
    extractAccessModeLabel(accessSections),
  )
  const isOnlineOnly =
    locations.length === 0 &&
    Boolean(
      accessModeLabel &&
        /online/i.test(accessModeLabel) &&
        !/physical/i.test(accessModeLabel),
    )
  const onlineAccessUrl = extractOnlineAccessUrl(accessSections)

  const moreInfoNarrative = extractNonUrlLines(moreInfoSections)
  if (moreInfoNarrative) {
    aboutSections.push({
      heading: '',
      lines: moreInfoNarrative.split('\n'),
    })
  }

  return {
    version: {
      ...version,
      locations,
      contacts,
      general_notes: formatNoteSections(aboutSections) ?? null,
    },
    eventDetails: buildEventDetailFields(
      scheduleSections,
      registrationSections,
    ),
    isOnlineOnly,
    accessModeLabel,
    onlineAccessUrl,
  }
}

function extractAccessModeLabel(sections: NoteSection[]): string | null {
  for (const section of sections) {
    for (const line of section.lines) {
      const value = labelledLineValue(line, 'Access type')
      if (value) return value
    }
  }
  return null
}

function buildEventDetailFields(
  scheduleSections: NoteSection[],
  registrationSections: NoteSection[],
): EventDetailField[] {
  const fields: EventDetailField[] = []
  const scheduleLines = scheduleSections.flatMap((section) => section.lines)

  const eventType = findLabelledValue(scheduleLines, 'Type')
  pushField(fields, 'Event type', eventType)

  const start = findLabelledValue(scheduleLines, 'Start')
  const end = findLabelledValue(scheduleLines, 'End')
  const firstOccurrence = findLabelledValue(scheduleLines, 'First occurrence')
  const timeOnly = findLabelledValue(scheduleLines, 'Time')
  const endTime = findLabelledValue(scheduleLines, 'End time')

  if (start) {
    const { date, time } = splitDateAndTime(start)
    pushField(fields, 'Date', date)
    pushField(fields, 'Time', time)
  } else if (firstOccurrence) {
    pushField(fields, 'Date', firstOccurrence)
  }

  if (timeOnly) {
    pushField(fields, 'Time', timeOnly)
  } else if (endTime && !fields.some((field) => field.label === 'Time')) {
    pushField(fields, 'Time', `Ends ${endTime}`)
  }

  if (end) {
    const { date, time } = splitDateAndTime(end)
    if (date && date !== fields.find((field) => field.label === 'Date')?.value) {
      pushField(fields, 'End date', date)
    }
    if (time) {
      const existingTime = fields.find((field) => field.label === 'Time')
      if (existingTime && !existingTime.value.includes('–')) {
        existingTime.value = `${existingTime.value} – ${time}`
      } else if (!existingTime) {
        pushField(fields, 'Time', time)
      }
    }
  }

  pushField(
    fields,
    'Repeats',
    formatRecurrenceFromNotes({
      frequencyRaw: findLabelledValue(scheduleLines, 'Frequency'),
      occursOnRaw: findLabelledValue(scheduleLines, 'Occurs on'),
    }),
  )

  const recurrenceEnd = findLabelledValue(scheduleLines, 'Recurrence end')
  if (isConcreteRecurrenceEndDate(recurrenceEnd)) {
    pushField(fields, 'Until', recurrenceEnd)
  } else if (recurrenceEnd && /^after\s+\d+\s+occurrences?$/i.test(recurrenceEnd)) {
    // Legacy occurrence-count endings — keep visible for older submissions.
    pushField(fields, 'Recurrence end', recurrenceEnd)
  }

  for (const line of scheduleLines) {
    if (KNOWN_SCHEDULE_LABELS.some((label) => labelledLineValue(line, label))) {
      continue
    }
    const trimmed = trimText(line)
    if (trimmed) pushField(fields, 'Schedule', trimmed)
  }

  const registrationRaw = formatMultiLineSection(registrationSections)
  const registration = normalizeRegistrationDisplay(registrationRaw)
  if (registration) {
    fields.push({
      label: 'Registration',
      value: registration,
      includeInPublic: !isRegistrationNotSure(registration),
    })
  }

  return fields
}

/**
 * Normalize registration note text to the three-state product labels.
 * Preserves legacy note wording by mapping into Required / Not required / Not sure.
 */
export function normalizeRegistrationDisplay(
  value: string | null | undefined,
): string | null {
  const text = trimText(value)
  if (!text) return null

  // Use first line only — ignore legacy "Instructions:" follow-ups.
  const firstLine = text.split('\n').map(trimText).find(Boolean) ?? text
  const lower = firstLine.toLowerCase()

  if (lower === 'required' || lower === 'registration required') {
    return 'Required'
  }
  if (lower === 'not sure') {
    return 'Not sure'
  }
  if (
    lower === 'not required' ||
    lower === 'no registration needed' ||
    lower === 'registration optional' ||
    lower === 'optional'
  ) {
    return 'Not required'
  }

  return firstLine
}

export function isRegistrationNotSure(value: string): boolean {
  return trimText(value).toLowerCase() === 'not sure'
}

const KNOWN_SCHEDULE_LABELS = [
  'Type',
  'Start',
  'End',
  'End time',
  'First occurrence',
  'Time',
  'Frequency',
  'Occurs on',
  'Recurrence end',
] as const

function findLabelledValue(lines: string[], label: string): string | null {
  for (const line of lines) {
    const value = labelledLineValue(line, label)
    if (value) return value
  }
  return null
}

function splitDateAndTime(value: string): { date: string | null; time: string | null } {
  const atMatch = /^(.+?)\s+at\s+(.+)$/i.exec(trimText(value))
  if (atMatch) {
    return {
      date: trimText(atMatch[1]) || null,
      time: trimText(atMatch[2]) || null,
    }
  }
  return { date: trimText(value) || null, time: null }
}

function formatMultiLineSection(sections: NoteSection[]): string | null {
  const lines = sections.flatMap((section) => section.lines).map(trimText).filter(Boolean)
  if (lines.length === 0) return null
  if (lines.length === 1) return lines[0]

  const [first, ...rest] = lines
  const details = rest
    .map((line) => line.replace(/^instructions:\s*/i, '').replace(/^limit:\s*/i, ''))
    .filter(Boolean)
  return details.length > 0 ? `${first}\n${details.join('\n')}` : first
}

function pushField(
  fields: EventDetailField[],
  label: string,
  value: string | null | undefined,
) {
  const text = trimText(value)
  if (!text) return
  if (fields.some((field) => field.label === label && field.value === text)) return
  fields.push({ label, value: text })
}
