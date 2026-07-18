import type {
  ResourceContactDto,
  ResourceLocationDto,
} from '@/types/resource'
import type { NoteSection } from '@/features/submissions/mappers/notes'
import { trimText } from '@/features/submissions/mappers/notes'

/**
 * Shared helpers for parsing labelled `general_notes` blocks produced by
 * public contribution mappers. Presentation-only — does not change API DTOs.
 */

export function normalizeNoteHeading(heading: string): string {
  return trimText(heading).replace(/:+\s*$/, '').toLowerCase()
}

/**
 * Inverse of `formatNoteSections`: split labelled blocks separated by blank lines.
 */
export function parseNoteSections(notes: string | null | undefined): NoteSection[] {
  const text = trimText(notes)
  if (!text) return []

  const blocks = text.split(/\n{2,}/)
  const sections: NoteSection[] = []

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line, index, all) => !(index === all.length - 1 && !trimText(line)))
    if (lines.length === 0) continue

    const first = lines[0] ?? ''
    if (/^.+:\s*$/.test(first)) {
      sections.push({
        heading: first.trim(),
        lines: lines.slice(1).map((line) => trimText(line)).filter(Boolean),
      })
      continue
    }

    const inline = /^(.+?:)\s*(.+)$/.exec(first)
    if (inline) {
      sections.push({
        heading: inline[1],
        lines: [inline[2], ...lines.slice(1)]
          .map((line) => trimText(line))
          .filter(Boolean),
      })
      continue
    }

    sections.push({
      heading: '',
      lines: lines.map((line) => trimText(line)).filter(Boolean),
    })
  }

  return sections.filter(
    (section) => section.lines.length > 0 || Boolean(trimText(section.heading)),
  )
}

export function applyLocationDetailNotes(
  locations: ResourceLocationDto[],
  sections: NoteSection[],
): ResourceLocationDto[] {
  if (sections.length === 0 || locations.length === 0) return locations

  const details = parseLocationDetailBlocks(
    sections.flatMap((section) => section.lines),
  )
  if (details.length === 0) return locations

  return locations.map((location, index) => {
    const detail = details[index]
    if (!detail) return location
    return {
      ...location,
      location_name: location.location_name || detail.name || null,
      address_line2:
        location.address_line2 ||
        (detail.unit ? `Unit / Suite: ${detail.unit}` : null),
      service_area_notes: joinUniqueParagraphs([
        location.service_area_notes,
        detail.extra,
      ]),
    }
  })
}

function parseLocationDetailBlocks(lines: string[]): Array<{
  name: string | null
  unit: string | null
  extra: string | null
}> {
  const blocks: Array<{
    name: string | null
    unit: string | null
    extra: string | null
  }> = []
  let current: {
    name: string | null
    unit: string | null
    extras: string[]
  } | null = null

  const pushCurrent = () => {
    if (!current) return
    blocks.push({
      name: current.name,
      unit: current.unit,
      extra: current.extras.length > 0 ? current.extras.join('\n') : null,
    })
    current = null
  }

  for (const raw of lines) {
    const line = trimText(raw)
    if (!line) continue

    if (/^location\s+\d+/i.test(line)) {
      pushCurrent()
      current = { name: null, unit: null, extras: [] }
      continue
    }

    if (!current) {
      current = { name: null, unit: null, extras: [] }
    }

    const nameMatch = /^name:\s*(.+)$/i.exec(line)
    if (nameMatch) {
      current.name = trimText(nameMatch[1]) || null
      continue
    }

    const unitMatch = /^unit\s*\/\s*suite:\s*(.+)$/i.exec(line)
    if (unitMatch) {
      current.unit = trimText(unitMatch[1]) || null
      continue
    }

    current.extras.push(line)
  }

  pushCurrent()
  return blocks
}

export function ensureContactsFromNotes(
  contacts: ResourceContactDto[],
  sections: NoteSection[],
): ResourceContactDto[] {
  const next = [...contacts]
  let syntheticId = -1

  for (const section of sections) {
    for (const line of section.lines) {
      const url = extractUrl(line)
      if (!url) continue
      const already = next.some(
        (contact) =>
          contact.contact_type.toLowerCase().includes('web') &&
          contact.contact_value.trim().toLowerCase() === url.toLowerCase(),
      )
      if (already) continue
      next.push({
        contact_id: syntheticId--,
        contact_type: 'website',
        contact_value: url,
        contact_label:
          normalizeNoteHeading(section.heading) === 'access'
            ? 'Online access'
            : 'More information',
        is_primary: false,
      })
    }
  }

  return next
}

export function extractUrl(line: string): string | null {
  const trimmed = trimText(line)
  const labelled =
    /^(?:online access(?: link)?|more information):\s*(.+)$/i.exec(trimmed)
  const candidate = labelled ? trimText(labelled[1]) : trimmed
  if (!candidate) return null
  if (/^https?:\/\//i.test(candidate)) return candidate
  if (/^www\./i.test(candidate)) return `https://${candidate}`
  if (
    /^[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(candidate) &&
    !candidate.includes(' ')
  ) {
    return `https://${candidate}`
  }
  return null
}

/** Prefer the labelled Online access URL from Access notes. */
export function extractOnlineAccessUrl(
  sections: NoteSection[],
): string | null {
  for (const section of sections) {
    for (const line of section.lines) {
      const labelled =
        labelledLineValue(line, 'Online access') ??
        labelledLineValue(line, 'Online access link')
      if (labelled) {
        return extractUrl(labelled) ?? extractUrl(`Online access: ${labelled}`)
      }
    }
  }
  for (const section of sections) {
    for (const line of section.lines) {
      if (!/online access/i.test(line)) continue
      const url = extractUrl(line)
      if (url) return url
    }
  }
  return null
}

/**
 * Access labels that add meaning beyond a physical address.
 * Suppresses redundant "Physical location".
 */
export function meaningfulAccessModeLabel(
  label: string | null | undefined,
): string | null {
  const text = trimText(label)
  if (!text) return null
  const lower = text.toLowerCase()
  if (lower === 'physical location' || lower === 'physical') return null
  return text
}

export function extractNonUrlLines(
  sections: NoteSection[],
  stripPrefix?: RegExp,
): string | null {
  const lines: string[] = []
  for (const section of sections) {
    for (const line of section.lines) {
      if (extractUrl(line)) continue
      const cleaned = trimText(
        stripPrefix ? line.replace(stripPrefix, '') : line,
      )
      if (cleaned) lines.push(cleaned)
    }
  }
  return lines.length > 0 ? lines.join('\n') : null
}

export function joinUniqueParagraphs(
  parts: Array<string | null | undefined>,
): string | null {
  const seen = new Set<string>()
  const values: string[] = []
  for (const part of parts) {
    const text = trimText(part)
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    values.push(text)
  }
  return values.length > 0 ? values.join('\n\n') : null
}

export function labelledLineValue(line: string, label: string): string | null {
  const pattern = new RegExp(`^${label}:\\s*(.+)$`, 'i')
  const match = pattern.exec(trimText(line))
  return match ? trimText(match[1]) || null : null
}
