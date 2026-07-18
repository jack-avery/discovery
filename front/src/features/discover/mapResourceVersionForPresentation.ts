import type {
  ResourceHourDto,
  ResourceVersionDto,
} from '@/types/resource'
import type { NoteSection } from '@/features/submissions/mappers/notes'
import { formatNoteSections, trimText } from '@/features/submissions/mappers/notes'
import {
  applyLocationDetailNotes,
  ensureContactsFromNotes,
  extractNonUrlLines,
  extractOnlineAccessUrl,
  joinUniqueParagraphs,
  labelledLineValue,
  meaningfulAccessModeLabel,
  normalizeNoteHeading,
  parseNoteSections,
} from '@/features/staff/submissions/noteSectionUtils'

/**
 * Canonical resource presentation model.
 * Used by Discover and staff Existing Resource review so seeded and
 * newly approved resources render identically.
 */
export interface ResourceVersionPresentation {
  version: ResourceVersionDto
  /** Unstructured hours text when structured `hours` rows are absent. */
  hoursSummary: string | null
  /**
   * Access mode label when it adds meaning (Online / hybrid).
   * Redundant "Physical location" is suppressed.
   */
  accessModeLabel: string | null
  /** True when access is online-only and no physical venues exist. */
  isOnlineOnly: boolean
  /** Labelled online-access URL for the Location card. */
  onlineAccessUrl: string | null
}

const HOURS_HEADINGS = new Set(['hours', 'hours notes', 'availability'])
const LOCATION_HEADINGS = new Set(['additional location details'])
const ACCESS_HEADINGS = new Set(['access'])
const MORE_INFO_HEADINGS = new Set(['more information'])
/** Event-only blocks — never rendered inside resource About. */
const EVENT_ONLY_HEADINGS = new Set([
  'event schedule',
  'registration',
  'capacity',
])
/** Skill-only blocks — handled by SkillDetailPresentation. */
const SKILL_ONLY_HEADINGS = new Set([
  'about the contributor',
  'why they would like to contribute',
  'who may benefit',
  'languages',
  'availability',
])
const ABOUT_HEADINGS = new Set([
  'additional details',
  'additional event details',
])

/**
 * Map a ResourceVersion (seeded or approved) into Discover section fields.
 * Strips labelled submission notes (Access / Hours / …) out of About.
 */
export function mapResourceVersionForPresentation(
  version: ResourceVersionDto,
): ResourceVersionPresentation {
  const sections = parseNoteSections(version.general_notes)
  if (sections.length === 0) {
    return {
      version: {
        ...version,
        general_notes: trimText(version.general_notes) || null,
      },
      hoursSummary: null,
      accessModeLabel: null,
      isOnlineOnly: false,
      onlineAccessUrl: null,
    }
  }

  const aboutSections: NoteSection[] = []
  const hoursSections: NoteSection[] = []
  const locationSections: NoteSection[] = []
  const accessSections: NoteSection[] = []
  const moreInfoSections: NoteSection[] = []

  for (const section of sections) {
    const key = normalizeNoteHeading(section.heading)
    if (EVENT_ONLY_HEADINGS.has(key) || SKILL_ONLY_HEADINGS.has(key)) {
      continue
    }
    if (HOURS_HEADINGS.has(key)) {
      hoursSections.push(section)
    } else if (LOCATION_HEADINGS.has(key)) {
      locationSections.push(section)
    } else if (ACCESS_HEADINGS.has(key)) {
      accessSections.push(section)
    } else if (MORE_INFO_HEADINGS.has(key)) {
      moreInfoSections.push(section)
    } else if (!section.heading || ABOUT_HEADINGS.has(key)) {
      aboutSections.push(section)
    } else {
      // Unknown labelled blocks: keep narrative, but drop access/hours-shaped lines.
      const cleaned = stripStructuredMetaLines(section)
      if (cleaned.lines.length > 0) aboutSections.push(cleaned)
    }
  }

  let locations = version.locations.map((location) => ({ ...location }))
  locations = applyLocationDetailNotes(locations, locationSections)

  let contacts = version.contacts.map((contact) => ({ ...contact }))
  contacts = ensureContactsFromNotes(contacts, [
    ...accessSections,
    ...moreInfoSections,
  ])

  const hoursSummary =
    version.hours.length === 0
      ? formatNoteSections(
          hoursSections.map((section) => ({
            heading: '',
            lines: section.lines,
          })),
        ) ?? null
      : null

  const moreInfoAboutLines = extractNonUrlLines(moreInfoSections)
  if (moreInfoAboutLines) {
    aboutSections.push({
      heading: '',
      lines: moreInfoAboutLines.split('\n'),
    })
  }

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

  return {
    version: {
      ...version,
      locations,
      contacts,
      general_notes: formatNoteSections(aboutSections) ?? null,
      hours:
        version.hours.length > 0
          ? mergeAppointmentNotesIntoHours(version.hours, hoursSections)
          : version.hours,
    },
    hoursSummary,
    accessModeLabel,
    isOnlineOnly,
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

/** Drop leftover Access/Hours lines that landed outside labelled sections. */
function stripStructuredMetaLines(section: NoteSection): NoteSection {
  const lines = section.lines.filter((line) => {
    const lower = line.toLowerCase()
    if (/^access(\s+type)?\s*:/.test(lower)) return false
    if (/^online access(\s+link)?\s*:/.test(lower)) return false
    if (/^hours(\s+notes)?\s*:/.test(lower)) return false
    return true
  })
  return { ...section, lines }
}

function mergeAppointmentNotesIntoHours(
  hours: ResourceHourDto[],
  sections: NoteSection[],
): ResourceHourDto[] {
  const noteText = formatNoteSections(
    sections.map((section) => ({ heading: '', lines: section.lines })),
  )
  if (!noteText) return hours.map((hour) => ({ ...hour }))

  return hours.map((hour, index) =>
    index === 0
      ? {
          ...hour,
          notes: joinUniqueParagraphs([hour.notes, noteText]),
        }
      : { ...hour },
  )
}

/** @deprecated Prefer {@link mapResourceVersionForPresentation}. */
export function mapProposedVersionForPresentation(
  version: ResourceVersionDto,
): ResourceVersionPresentation {
  return mapResourceVersionForPresentation(version)
}

export { parseNoteSections } from '@/features/staff/submissions/noteSectionUtils'
