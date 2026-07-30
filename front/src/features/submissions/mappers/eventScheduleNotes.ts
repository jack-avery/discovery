import type { ResourceVersionDto } from '@/types/resource'
import { trimText } from './notes'

/**
 * Detects the labelled "Event schedule:" block written by the public event mapper.
 * Shared by Discover (resource vs event presentation) and staff moderation helpers.
 *
 * Lives under submissions/mappers because that is where the note contract is authored —
 * not under features/staff or features/discover.
 */

const EVENT_SCHEDULE_HEADING = 'event schedule'

function normalizeNoteHeading(heading: string): string {
  return trimText(heading).replace(/:+\s*$/, '').toLowerCase()
}

/**
 * True when labelled event-schedule notes are present on a resource version.
 * Ordinary `resource_type === 'Program'` rows without this block are not events.
 *
 * Heading detection mirrors `parseNoteSections` so Discover and staff stay aligned
 * without importing presentation utilities from features/staff.
 */
export function hasEventScheduleNotes(version: ResourceVersionDto): boolean {
  const text = trimText(version.general_notes)
  if (!text) return false

  for (const block of text.split(/\n{2,}/)) {
    const lines = block
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line, index, all) => !(index === all.length - 1 && !trimText(line)))
    if (lines.length === 0) continue

    const first = lines[0] ?? ''
    let heading: string | null = null

    if (/^.+:\s*$/.test(first)) {
      heading = first.trim()
    } else {
      const inline = /^(.+?:)\s*(.+)$/.exec(first)
      if (inline) heading = inline[1]
    }

    if (heading && normalizeNoteHeading(heading) === EVENT_SCHEDULE_HEADING) {
      return true
    }
  }

  return false
}
