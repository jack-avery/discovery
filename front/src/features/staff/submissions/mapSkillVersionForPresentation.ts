import type { ResourceLocationDto, ResourceVersionDto } from '@/types/resource'
import type { SubmissionDetailDto } from '@/types/moderationSubmission'
import type { NoteSection } from '@/features/submissions/mappers/notes'
import { trimText } from '@/features/submissions/mappers/notes'
import {
  applyLocationDetailNotes,
  ensureContactsFromNotes,
  extractUrl,
  labelledLineValue,
  normalizeNoteHeading,
  parseNoteSections,
} from '@/features/staff/submissions/noteSectionUtils'

/**
 * Presentation model for My Skills or Services review.
 * Parsed from proposed version + submission submitter fields — no API changes.
 */
export interface SkillVersionPresentation {
  title: string
  imageUrl: string | null
  about: {
    contributor: string | null
    motivation: string | null
    description: string | null
  }
  skillsOffered: string[]
  availability: string[]
  availabilityNotes: string | null
  languages: string[]
  whoCanBenefit: string | null
  locations: ResourceLocationDto[]
  /** Online / hybrid / physical label when no structured locations exist. */
  serviceAreaSummary: string | null
  contact: {
    preferredMethod: string | null
    phone: string | null
    email: string | null
    website: string | null
    name: string | null
  }
}

const ABOUT_CONTRIBUTOR = 'about the contributor'
const MOTIVATION = 'why they would like to contribute'
const WHO_BENEFITS = 'who may benefit'
const LANGUAGES = 'languages'
const AVAILABILITY = 'availability'
const LOCATION_HEADINGS = new Set(['additional location details'])
const ACCESS_HEADINGS = new Set(['access'])

/**
 * Detect skill/service contributions (community_asset / Volunteer Skill).
 */
export function isSkillProposedVersion(
  version: ResourceVersionDto,
  submissionType?: string,
): boolean {
  if (submissionType === 'community_asset') return true
  if (version.resource_type === 'Volunteer Skill') return true
  const sections = parseNoteSections(version.general_notes)
  return sections.some((section) => {
    const key = normalizeNoteHeading(section.heading)
    return key === ABOUT_CONTRIBUTOR || key === MOTIVATION
  })
}

/**
 * Map a skill/service submission into SkillDetailPresentation data.
 */
export function mapSkillVersionForPresentation(
  submission: Pick<
    SubmissionDetailDto,
    | 'proposed_version'
    | 'submitter_name'
    | 'submitter_email'
    | 'submitter_phone'
    | 'submission_message'
    | 'submission_type'
  >,
): SkillVersionPresentation | null {
  const version = submission.proposed_version
  if (!version) return null

  const sections = parseNoteSections(version.general_notes)

  let aboutContributor: string | null = null
  let motivation: string | null = null
  let whoFromNotes: string | null = null
  let languages: string[] = []
  let availability: string[] = []
  let availabilityNotes: string | null = null
  const locationSections: NoteSection[] = []
  const accessSections: NoteSection[] = []

  for (const section of sections) {
    const key = normalizeNoteHeading(section.heading)
    if (key === ABOUT_CONTRIBUTOR) {
      aboutContributor = joinSectionLines(section.lines)
    } else if (key === MOTIVATION) {
      motivation = joinSectionLines(section.lines)
    } else if (key === WHO_BENEFITS) {
      whoFromNotes = joinSectionLines(section.lines)
    } else if (key === LANGUAGES) {
      languages = splitChipValues(section.lines)
    } else if (key === AVAILABILITY) {
      const parsed = parseAvailabilitySection(section.lines)
      availability = parsed.items
      availabilityNotes = parsed.notes
    } else if (LOCATION_HEADINGS.has(key)) {
      locationSections.push(section)
    } else if (ACCESS_HEADINGS.has(key)) {
      accessSections.push(section)
    }
    // Ignore unknown labelled blocks — do not dump into About.
  }

  let locations = version.locations.map((location) => ({ ...location }))
  locations = applyLocationDetailNotes(locations, locationSections)

  let contacts = version.contacts.map((contact) => ({ ...contact }))
  contacts = ensureContactsFromNotes(contacts, accessSections)

  const websiteFromContacts =
    contacts.find((c) => c.contact_type.toLowerCase().includes('web'))
      ?.contact_value ?? null

  const accessMode = extractAccessMode(accessSections)
  const onlineUrl = extractFirstUrl(accessSections)

  const messageMeta = parseSubmissionMessage(submission.submission_message)

  const whoCanBenefit =
    trimText(version.eligibility) || whoFromNotes || null

  const skillsOffered = buildSkillsOffered(version)

  const serviceAreaSummary =
    locations.length > 0
      ? null
      : accessMode || (onlineUrl ? 'Online services' : null)

  return {
    title: trimText(version.name) || 'Skills or services',
    imageUrl: version.image_url,
    about: {
      contributor: aboutContributor,
      motivation,
      description: trimText(version.description) || null,
    },
    skillsOffered,
    availability,
    availabilityNotes,
    languages,
    whoCanBenefit,
    locations,
    serviceAreaSummary,
    contact: {
      preferredMethod: messageMeta.preferredMethod,
      phone:
        trimText(submission.submitter_phone) ||
        contacts.find((c) => c.contact_type.toLowerCase().includes('phone'))
          ?.contact_value ||
        null,
      email:
        trimText(submission.submitter_email) ||
        contacts.find((c) => c.contact_type.toLowerCase().includes('email'))
          ?.contact_value ||
        null,
      website: websiteFromContacts || onlineUrl,
      name: trimText(submission.submitter_name) || null,
    },
  }
}

function buildSkillsOffered(version: ResourceVersionDto): string[] {
  const fromName = splitChipValues([version.name])
  const fromTags = version.tags
    .map((tag) => trimText(tag.name))
    .filter(Boolean)
  const fromCategories = version.categories
    .map((category) => trimText(category.name))
    .filter(Boolean)

  const seen = new Set<string>()
  const result: string[] = []
  for (const item of [...fromName, ...fromTags, ...fromCategories]) {
    const key = item.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

function parseAvailabilitySection(lines: string[]): {
  items: string[]
  notes: string | null
} {
  if (lines.length === 0) return { items: [], notes: null }

  const known = new Set([
    'weekdays',
    'evenings',
    'weekends',
    'flexible',
    'flexible schedule',
  ])

  const items: string[] = []
  const notes: string[] = []

  for (const line of lines) {
    const parts = line.split(',').map((part) => trimText(part)).filter(Boolean)
    if (parts.length > 1 && parts.every((part) => known.has(part.toLowerCase()))) {
      items.push(...parts.map(normalizeAvailabilityLabel))
      continue
    }

    const single = trimText(line)
    if (!single) continue
    if (known.has(single.toLowerCase()) || looksLikeAvailabilityChip(single)) {
      items.push(...splitChipValues([single]).map(normalizeAvailabilityLabel))
    } else {
      notes.push(single)
    }
  }

  return {
    items: uniquePreserveOrder(items),
    notes: notes.length > 0 ? notes.join('\n') : null,
  }
}

function looksLikeAvailabilityChip(value: string): boolean {
  return /^(weekdays|evenings|weekends|flexible)(\s+schedule)?$/i.test(value.trim())
}

function normalizeAvailabilityLabel(value: string): string {
  const trimmed = trimText(value)
  if (/^flexible(\s+schedule)?$/i.test(trimmed)) return 'Flexible schedule'
  if (/^weekdays$/i.test(trimmed)) return 'Weekdays'
  if (/^evenings$/i.test(trimmed)) return 'Evenings'
  if (/^weekends$/i.test(trimmed)) return 'Weekends'
  return trimmed
}

function splitChipValues(lines: string[]): string[] {
  const values: string[] = []
  for (const line of lines) {
    const text = trimText(line)
    if (!text) continue
    // Prefer comma / semicolon / bullet splits for multi-value lines.
    if (/[,;•|]/.test(text)) {
      values.push(
        ...text
          .split(/[,;•|]/)
          .map((part) => trimText(part))
          .filter(Boolean),
      )
    } else {
      values.push(text)
    }
  }
  return uniquePreserveOrder(values)
}

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }
  return result
}

function joinSectionLines(lines: string[]): string | null {
  const text = lines.map(trimText).filter(Boolean).join('\n')
  return text || null
}

function extractAccessMode(sections: NoteSection[]): string | null {
  for (const section of sections) {
    for (const line of section.lines) {
      const value = labelledLineValue(line, 'Access type')
      if (value) return value
    }
  }
  return null
}

function extractFirstUrl(sections: NoteSection[]): string | null {
  for (const section of sections) {
    for (const line of section.lines) {
      const url = extractUrl(line)
      if (url) return url
    }
  }
  return null
}

function parseSubmissionMessage(message: string | null | undefined): {
  preferredMethod: string | null
} {
  const text = trimText(message)
  if (!text) return { preferredMethod: null }

  for (const block of text.split(/\n{2,}/)) {
    for (const line of block.split('\n')) {
      const preferred = labelledLineValue(line, 'Preferred contact method')
      if (preferred) return { preferredMethod: preferred }
    }
  }
  return { preferredMethod: null }
}
