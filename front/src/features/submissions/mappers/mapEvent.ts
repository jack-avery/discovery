import type {
  Contribution,
  ContributorInfo,
  EventContributionData,
} from '@/types/submission'
import type { ApprovedResourceVersionPayload } from '@/types/moderationSubmission'
import type { CreateSubmissionRequestDto } from '@/types/submissionApi'
import type { ApprovedVersionSourceFields } from './approvedVersionSource'
import {
  buildLocationDetailNotes,
  ensureWebsiteContact,
  joinNoteSections,
  mapPublicContacts,
  mapPublicLocations,
} from './contactsAndLocations'
import { mapEventCostDescription } from './cost'
import { finalizeApprovedVersionPayload } from './finalizeApprovedVersionPayload'
import {
  ACCESS_MODE_LABELS,
  EVENT_RELATIONSHIP_LABELS,
  FREQUENCY_LABELS,
  RECURRENCE_END_LABELS,
  REGISTRATION_LABELS,
  SCHEDULE_KIND_LABELS,
} from './labels'
import {
  formatOccursOnNoteLine,
} from './eventRecurrence'
import { compactPayload, line, trimText, type NoteSection } from './notes'
import {
  joinMessageParts,
  mapSubmitterFields,
  preferredContactMessageLine,
} from './submitter'

/**
 * Temporary backend resource_type — mapper-only, not shown in UI.
 * Event → Program (interim strategy until a first-class Event type exists).
 */
const TEMP_RESOURCE_TYPE = 'Program' as const

export function mapEventContribution(
  contribution: Contribution,
  contributor: ContributorInfo,
): CreateSubmissionRequestDto {
  if (contribution.data.kind !== 'event') {
    throw new Error('Expected event contribution data.')
  }

  const content = mapEventVersionContent(contribution.data, {
    name: contribution.title,
    resource_type: TEMP_RESOURCE_TYPE,
  })

  if (!trimText(content.name)) {
    throw new Error('Event contribution is missing a name.')
  }

  const payload: CreateSubmissionRequestDto = {
    submission_type: 'new_resource',
    ...content,
    ...mapSubmitterFields(contributor),
    submission_message: joinMessageParts([
      preferredContactMessageLine(contributor),
      eventRelationshipMessage(contribution.data),
    ]),
  }

  return compactPayload(payload)
}

/**
 * Publishable resource/version content for an event form model.
 * Does not include submission, contributor, or moderation fields.
 */
export function mapEventVersionContent(
  data: EventContributionData,
  source: ApprovedVersionSourceFields = {},
): ApprovedResourceVersionPayload {
  const name = trimText(data.name) || trimText(source.name)

  let contacts = mapPublicContacts(data.contacts)
  contacts = ensureWebsiteContact(contacts, data.onlineUrl)

  const locations =
    data.accessMode === 'online' ? [] : mapPublicLocations(data.locations)

  return finalizeApprovedVersionPayload({
    name,
    resource_type: trimText(source.resource_type) || undefined,
    description: trimText(data.description) || undefined,
    eligibility: trimText(data.eligibility) || undefined,
    cost_description: mapEventCostDescription(
      data.costOption,
      data.costDetails,
    ),
    accessibility_notes: trimText(data.accessibilityNotes) || undefined,
    general_notes: buildEventNotes(data),
    image_url: trimText(source.image_url) || undefined,
    category_ids: data.categoryIds.length > 0 ? [...data.categoryIds] : undefined,
    tag_ids: data.filterIds.length > 0 ? [...data.filterIds] : undefined,
    locations: locations.length > 0 ? locations : undefined,
    contacts: contacts.length > 0 ? contacts : undefined,
  })
}

function eventRelationshipMessage(data: EventContributionData): string | null {
  if (!data.relationship) return null
  const label =
    data.relationship === 'other' && trimText(data.relationshipOther)
      ? trimText(data.relationshipOther)
      : EVENT_RELATIONSHIP_LABELS[data.relationship]
  return line('Connection to this event', label)
}

function formatDisplayDate(iso: string): string {
  const value = trimText(iso)
  if (!value) return ''
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-CA', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDisplayTime(time: string): string {
  const value = trimText(time)
  if (!value) return ''
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return value
  const hours = Number(match[1])
  const minutes = match[2]
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes} ${period}`
}

function buildEventNotes(data: EventContributionData): string | undefined {
  const sections: Array<NoteSection | null> = []

  sections.push(buildScheduleSection(data))
  sections.push(buildRegistrationSection(data))

  if (data.accessMode) {
    const accessLines = [
      line('Access type', ACCESS_MODE_LABELS[data.accessMode]),
    ]
    if (
      (data.accessMode === 'online' || data.accessMode === 'both') &&
      trimText(data.onlineUrl)
    ) {
      accessLines.push(line('Online access', data.onlineUrl))
    }
    sections.push({
      heading: 'Access:',
      lines: accessLines.filter(Boolean) as string[],
    })
  }

  if (data.accessMode !== 'online') {
    sections.push(buildLocationDetailNotes(data.locations))
  }

  if (trimText(data.moreInfoUrl)) {
    sections.push({
      heading: 'More information:',
      lines: [trimText(data.moreInfoUrl)],
    })
  }

  if (trimText(data.generalNotes)) {
    sections.push({
      heading: 'Additional event details:',
      lines: [trimText(data.generalNotes)],
    })
  }

  return joinNoteSections(sections)
}

function buildScheduleSection(data: EventContributionData): NoteSection | null {
  if (!data.scheduleKind) return null

  const lines: string[] = [
    `Type: ${SCHEDULE_KIND_LABELS[data.scheduleKind]}`,
  ]

  if (data.scheduleKind === 'one_time') {
    const startDate = formatDisplayDate(data.startDate)
    const startTime = formatDisplayTime(data.startTime)
    const endDate = formatDisplayDate(data.endDate)
    const endTime = formatDisplayTime(data.endTime)

    if (startDate && startTime) {
      lines.push(`Start: ${startDate} at ${startTime}`)
    } else if (startDate) {
      lines.push(`Start: ${startDate}`)
    }

    if (endDate && endTime) {
      lines.push(`End: ${endDate} at ${endTime}`)
    } else if (endDate) {
      lines.push(`End: ${endDate}`)
    } else if (endTime) {
      lines.push(`End time: ${endTime}`)
    }
  } else {
    const first = formatDisplayDate(data.startDate)
    if (first) lines.push(`First occurrence: ${first}`)

    const startTime = formatDisplayTime(data.startTime)
    const endTime = formatDisplayTime(data.endTime)
    if (startTime && endTime) {
      lines.push(`Time: ${startTime}–${endTime}`)
    } else if (startTime) {
      lines.push(`Time: ${startTime}`)
    }

    if (data.frequency === 'other' && trimText(data.frequencyOther)) {
      lines.push(`Frequency: ${trimText(data.frequencyOther)}`)
    } else if (data.frequency) {
      lines.push(`Frequency: ${FREQUENCY_LABELS[data.frequency]}`)
    }

    const occursOn = formatOccursOnNoteLine(data.recurrenceWeekdays)
    if (occursOn) lines.push(occursOn)

    if (data.recurrenceEndKind === 'end_date') {
      const end = formatDisplayDate(data.recurrenceEndDate)
      if (end) {
        lines.push(`Recurrence end: ${end}`)
      }
    } else if (data.recurrenceEndKind === 'occurrences') {
      const count = trimText(data.recurrenceOccurrences)
      lines.push(
        count
          ? `Recurrence end: After ${count} occurrences`
          : `Recurrence end: ${RECURRENCE_END_LABELS.occurrences}`,
      )
    }
    // Never / not_sure: omit Recurrence end so presentation stays clean.
  }

  return {
    heading: 'Event schedule:',
    lines,
  }
}

function buildRegistrationSection(
  data: EventContributionData,
): NoteSection | null {
  if (!data.registrationMode) return null
  return {
    heading: 'Registration:',
    lines: [REGISTRATION_LABELS[data.registrationMode]],
  }
}
