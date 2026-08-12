import {
  normalizeNoteHeading,
  parseNoteSections,
} from '@/features/staff/submissions/noteSectionUtils'
import { AVAILABILITY_LABELS } from '@/features/submissions/mappers/labels'
import { trimText } from '@/features/submissions/mappers/notes'
import type { AvailabilityOption } from '@/types/submission'
import type { SkillsFollowUpDetailDto } from '@/types/skillsFollowUp'
import { formatPhoneNational } from '@/utils/phone'

/** A single labelled field for the expanded follow-up detail panel. */
export interface SkillsFollowUpDetailField {
  id: string
  label: string
  /** Plain text value already formatted for display. */
  value: string
  /** Optional link target (mailto: / tel:). */
  href?: string
}

export interface SkillsFollowUpDetailSection {
  id: string
  title: string
  fields: SkillsFollowUpDetailField[]
}

export interface SkillsFollowUpDetailViewModel {
  /** Contributor-submitted sections (blank sections omitted). */
  sections: SkillsFollowUpDetailSection[]
  /** Staff operational metadata — kept separate from contributor content. */
  acceptedBy: string | null
}

const ABOUT_CONTRIBUTOR = 'about the contributor'
const MOTIVATION = 'why they would like to contribute'
const WHO_BENEFITS = 'who may benefit'
const LANGUAGES = 'languages'
const AVAILABILITY = 'availability'

/**
 * Map GET /skills-follow-ups/:id into labelled display sections.
 *
 * Explicitly maps contributor fields encoded in the detail payload
 * (submitter_*, skill_description, eligibility_or_availability, general_notes,
 * submission_message). Does not dump internal IDs, statuses, or staff notes.
 */
export function buildSkillsFollowUpDetailView(
  detail: SkillsFollowUpDetailDto,
): SkillsFollowUpDetailViewModel {
  const submission = detail.submission
  const notes = parseNoteSections(submission?.general_notes)
  const parsedNotes = extractNotesFields(notes)
  const messageMeta = parseSubmissionMessage(submission?.submission_message)

  const whoBenefits =
    meaningfulText(submission?.eligibility_or_availability) ||
    parsedNotes.whoBenefits

  const contactFields = compactFields([
    textField('name', 'Name', submission?.submitter_name),
    emailField(submission?.submitter_email),
    phoneField(submission?.submitter_phone),
    textField(
      'preferred-contact',
      'Preferred contact method',
      messageMeta.preferredMethod,
    ),
  ])

  const offerFields = compactFields([
    textField('description', 'Description', submission?.skill_description),
    textField('who-benefits', 'Who may benefit', whoBenefits),
  ])

  const availabilityFields = compactFields([
    textField(
      'availability',
      'Availability',
      parsedNotes.availabilityLabels.length > 0
        ? parsedNotes.availabilityLabels.join(', ')
        : null,
    ),
    textField(
      'availability-notes',
      'Availability notes',
      parsedNotes.availabilityNotes,
    ),
  ])

  const languageFields = compactFields([
    textField(
      'languages',
      'Languages',
      parsedNotes.languages.length > 0
        ? parsedNotes.languages.join(', ')
        : null,
    ),
  ])

  const aboutFields = compactFields([
    textField('about-you', 'About the contributor', parsedNotes.aboutYou),
    textField('inspiration', 'Inspiration', parsedNotes.inspiration),
  ])

  const additionalFields = compactFields([
    textField(
      'connection',
      'Is this something they personally provide?',
      messageMeta.connectionLabel,
    ),
    textField(
      'on-behalf-details',
      'On whose behalf',
      messageMeta.onBehalfOfNotes,
    ),
    textField(
      'other-message',
      'Additional message',
      messageMeta.residualMessage,
    ),
  ])

  const sections = compactSections([
    { id: 'contact', title: 'Contact', fields: contactFields },
    { id: 'about-offer', title: 'About this offer', fields: offerFields },
    { id: 'availability', title: 'Availability', fields: availabilityFields },
    { id: 'languages', title: 'Languages', fields: languageFields },
    { id: 'about-contributor', title: 'About the contributor', fields: aboutFields },
    {
      id: 'additional',
      title: 'Additional information',
      fields: additionalFields,
    },
  ])

  return {
    sections,
    acceptedBy: meaningfulText(detail.accepted_by),
  }
}

function extractNotesFields(sections: ReturnType<typeof parseNoteSections>): {
  aboutYou: string | null
  inspiration: string | null
  whoBenefits: string | null
  languages: string[]
  availabilityLabels: string[]
  availabilityNotes: string | null
} {
  let aboutYou: string | null = null
  let inspiration: string | null = null
  let whoBenefits: string | null = null
  let languages: string[] = []
  let availabilityLabels: string[] = []
  let availabilityNotes: string | null = null

  for (const section of sections) {
    const key = normalizeNoteHeading(section.heading)
    if (key === ABOUT_CONTRIBUTOR) {
      aboutYou = joinLines(section.lines)
    } else if (key === MOTIVATION) {
      inspiration = joinLines(section.lines)
    } else if (key === WHO_BENEFITS) {
      whoBenefits = joinLines(section.lines)
    } else if (key === LANGUAGES) {
      languages = splitList(section.lines)
    } else if (key === AVAILABILITY) {
      const parsed = parseAvailability(section.lines)
      availabilityLabels = parsed.labels
      availabilityNotes = parsed.notes
    }
  }

  return {
    aboutYou,
    inspiration,
    whoBenefits,
    languages,
    availabilityLabels,
    availabilityNotes,
  }
}

function parseSubmissionMessage(message: string | null | undefined): {
  preferredMethod: string | null
  connectionLabel: string | null
  onBehalfOfNotes: string | null
  residualMessage: string | null
} {
  const text = meaningfulText(message)
  if (!text) {
    return {
      preferredMethod: null,
      connectionLabel: null,
      onBehalfOfNotes: null,
      residualMessage: null,
    }
  }

  let preferredMethod: string | null = null
  let connectionLabel: string | null = null
  let onBehalfOfNotes: string | null = null
  const residual: string[] = []

  for (const block of text.split(/\n{2,}/)) {
    const blockText = trimText(block)
    if (!blockText) continue

    const preferred = labelledBlockValue(blockText, 'Preferred contact method')
    if (preferred) {
      preferredMethod = preferred
      continue
    }

    if (/on someone else's behalf/i.test(blockText)) {
      connectionLabel = "Submitted on someone else's behalf"
      const details = /Details:\s*(.+)$/im.exec(blockText)
      onBehalfOfNotes = details ? meaningfulText(details[1]) : null
      continue
    }

    residual.push(blockText)
  }

  // Prefer an explicit personal connection only when on-behalf was not set and
  // the message contained something else (preferred contact alone ≠ "yes").
  // The mapper only writes on-behalf into submission_message; "yes" leaves no
  // connection line — do not invent one.

  return {
    preferredMethod,
    connectionLabel,
    onBehalfOfNotes,
    residualMessage: residual.length > 0 ? residual.join('\n\n') : null,
  }
}

function labelledBlockValue(block: string, label: string): string | null {
  const pattern = new RegExp(`^${escapeRegExp(label)}:\\s*(.+)$`, 'is')
  const match = pattern.exec(block)
  return match ? meaningfulText(match[1]) : null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseAvailability(lines: string[]): {
  labels: string[]
  notes: string | null
} {
  const labels: string[] = []
  const notes: string[] = []
  const labelToKey = new Map(
    (
      Object.entries(AVAILABILITY_LABELS) as Array<[AvailabilityOption, string]>
    ).map(([key, label]) => [label.toLowerCase(), key]),
  )
  labelToKey.set('flexible schedule', 'flexible')

  for (const line of lines) {
    const parts = line
      .split(',')
      .map((part) => trimText(part))
      .filter(Boolean)
    const allKnown =
      parts.length > 0 &&
      parts.every((part) => labelToKey.has(part.toLowerCase()))
    if (allKnown) {
      for (const part of parts) {
        const key = labelToKey.get(part.toLowerCase())
        if (!key) continue
        const label = AVAILABILITY_LABELS[key]
        if (!labels.includes(label)) labels.push(label)
      }
      continue
    }

    const single = trimText(line)
    if (!single) continue
    const key = labelToKey.get(single.toLowerCase())
    if (key) {
      const label = AVAILABILITY_LABELS[key]
      if (!labels.includes(label)) labels.push(label)
    } else {
      notes.push(single)
    }
  }

  return {
    labels,
    notes: notes.length > 0 ? notes.join('\n') : null,
  }
}

function splitList(lines: string[]): string[] {
  const values: string[] = []
  for (const line of lines) {
    const text = trimText(line)
    if (!text) continue
    if (/[,;]/.test(text)) {
      values.push(
        ...text
          .split(/[,;]/)
          .map((part) => trimText(part))
          .filter(Boolean),
      )
    } else {
      values.push(text)
    }
  }
  return values
}

function joinLines(lines: string[]): string | null {
  return meaningfulText(lines.map(trimText).filter(Boolean).join('\n'))
}

function meaningfulText(value: string | null | undefined): string | null {
  const text = trimText(value)
  return text.length > 0 ? text : null
}

function textField(
  id: string,
  label: string,
  value: string | null | undefined,
): SkillsFollowUpDetailField | null {
  const text = meaningfulText(value)
  if (!text) return null
  return { id, label, value: text }
}

function emailField(
  value: string | null | undefined,
): SkillsFollowUpDetailField | null {
  const text = meaningfulText(value)
  if (!text) return null
  return { id: 'email', label: 'Email', value: text, href: `mailto:${text}` }
}

function phoneField(
  value: string | null | undefined,
): SkillsFollowUpDetailField | null {
  const text = meaningfulText(value)
  if (!text) return null
  return {
    id: 'phone',
    label: 'Phone',
    value: formatPhoneNational(text),
    href: `tel:${text.replace(/[^\d+]/g, '')}`,
  }
}

function compactFields(
  fields: Array<SkillsFollowUpDetailField | null>,
): SkillsFollowUpDetailField[] {
  return fields.filter((field): field is SkillsFollowUpDetailField => field !== null)
}

function compactSections(
  sections: SkillsFollowUpDetailSection[],
): SkillsFollowUpDetailSection[] {
  return sections.filter((section) => section.fields.length > 0)
}
