import type {
  AvailabilityOption,
  PersonalProviderOption,
  SkillsServicesData,
} from '@/types/submission'
import type { SubmissionDetailDto } from '@/types/moderationSubmission'
import {
  createEmptySkillsServicesData,
  normalizeSkillsServicesData,
} from '@/features/submissions/skillsServices/emptyState'
import { AVAILABILITY_LABELS } from '@/features/submissions/mappers/labels'
import { trimText } from '@/features/submissions/mappers/notes'
import {
  normalizeNoteHeading,
  parseNoteSections,
} from '@/features/staff/submissions/noteSectionUtils'

/**
 * Prefill the skills editor model from a community_asset submission detail.
 * Best-effort reverse of mapSkillsServicesContribution note encoding.
 */
export function mapSkillSubmissionToSkillsServicesData(
  submission: Pick<
    SubmissionDetailDto,
    'proposed_version' | 'submission_message'
  >,
): SkillsServicesData {
  const version = submission.proposed_version
  if (!version) return createEmptySkillsServicesData()

  const sections = parseNoteSections(version.general_notes)
  let aboutYou = ''
  let inspiration = ''
  let whoFromNotes = ''
  let languages: string[] = ['']
  let availability: AvailabilityOption[] = []
  let availabilityNotes = ''

  for (const section of sections) {
    const key = normalizeNoteHeading(section.heading)
    if (key === 'about the contributor') {
      aboutYou = joinLines(section.lines)
    } else if (key === 'why they would like to contribute') {
      inspiration = joinLines(section.lines)
    } else if (key === 'who may benefit') {
      whoFromNotes = joinLines(section.lines)
    } else if (key === 'languages') {
      languages = splitList(section.lines)
      if (languages.length === 0) languages = ['']
    } else if (key === 'availability') {
      const parsed = parseAvailability(section.lines)
      availability = parsed.items
      availabilityNotes = parsed.notes
    }
  }

  const onBehalf = parseOnBehalf(submission.submission_message)

  return normalizeSkillsServicesData({
    ...createEmptySkillsServicesData(),
    title: trimText(version.name) || '',
    description: trimText(version.description) || '',
    whoBenefits: trimText(version.eligibility) || whoFromNotes,
    availability,
    availabilityNotes,
    languages,
    aboutYou,
    inspiration,
    providedPersonally: onBehalf.providedPersonally,
    onBehalfOfNotes: onBehalf.onBehalfOfNotes,
  })
}

function joinLines(lines: string[]): string {
  return lines.map(trimText).filter(Boolean).join('\n')
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

function parseAvailability(lines: string[]): {
  items: AvailabilityOption[]
  notes: string
} {
  const items: AvailabilityOption[] = []
  const notes: string[] = []
  const labelToKey = new Map(
    (Object.entries(AVAILABILITY_LABELS) as Array<[AvailabilityOption, string]>).map(
      ([key, label]) => [label.toLowerCase(), key],
    ),
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
        if (key && !items.includes(key)) items.push(key)
      }
      continue
    }
    const single = trimText(line)
    if (!single) continue
    const key = labelToKey.get(single.toLowerCase())
    if (key) {
      if (!items.includes(key)) items.push(key)
    } else {
      notes.push(single)
    }
  }

  return { items, notes: notes.join('\n') }
}

function parseOnBehalf(message: string | null | undefined): {
  providedPersonally: PersonalProviderOption | null
  onBehalfOfNotes: string
} {
  const text = trimText(message)
  if (!text) return { providedPersonally: null, onBehalfOfNotes: '' }
  if (!/on someone else's behalf/i.test(text)) {
    return { providedPersonally: 'yes', onBehalfOfNotes: '' }
  }
  const details = /Details:\s*(.+)$/im.exec(text)
  return {
    providedPersonally: 'on_behalf',
    onBehalfOfNotes: details ? trimText(details[1]) : '',
  }
}
