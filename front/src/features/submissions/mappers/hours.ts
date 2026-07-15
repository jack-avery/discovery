import type { DayHours, HoursAvailability } from '@/types/submission'
import type { PublicSubmissionHourDto } from '@/types/submissionApi'
import {
  HOURS_AVAILABILITY_LABELS,
  WEEKDAY_DISPLAY,
  WEEKDAY_NAMES,
} from './labels'
import { formatNoteSections, trimText, type NoteSection } from './notes'

/**
 * Map structured weekly hours to public API rows.
 * Uses lowercase weekday names and open_time / close_time.
 */
export function mapPublicHours(
  hoursAvailability: HoursAvailability,
  hours: DayHours[],
): PublicSubmissionHourDto[] {
  if (hoursAvailability !== 'structured') return []

  const seen = new Set<number>()
  const rows: PublicSubmissionHourDto[] = []

  for (const day of hours) {
    if (seen.has(day.dayOfWeek)) continue
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) continue
    seen.add(day.dayOfWeek)

    const weekday = WEEKDAY_NAMES[day.dayOfWeek]

    if (day.isClosed) {
      rows.push({
        day_of_week: weekday,
        is_closed: true,
      })
      continue
    }

    // By-appointment days are not a clean API shape — skip row, note separately.
    if (day.byAppointment) continue

    const open = trimText(day.opensAt)
    const close = trimText(day.closesAt)
    if (!open || !close) continue

    rows.push({
      day_of_week: weekday,
      open_time: open,
      close_time: close,
      is_closed: false,
    })
  }

  return rows
}

export function buildHoursNoteSections(
  hoursAvailability: HoursAvailability,
  hours: DayHours[],
): NoteSection[] {
  const sections: NoteSection[] = []

  if (hoursAvailability !== 'structured') {
    sections.push({
      heading: 'Hours:',
      lines: [HOURS_AVAILABILITY_LABELS[hoursAvailability]],
    })
    return sections
  }

  const appointmentDays = hours
    .filter((d) => d.byAppointment && !d.isClosed)
    .map((d) => WEEKDAY_DISPLAY[d.dayOfWeek])
    .filter(Boolean)

  if (appointmentDays.length > 0) {
    sections.push({
      heading: 'Hours notes:',
      lines: [`By appointment: ${appointmentDays.join(', ')}`],
    })
  }

  return sections
}

export function hoursNotesText(
  hoursAvailability: HoursAvailability,
  hours: DayHours[],
): string | undefined {
  return formatNoteSections(buildHoursNoteSections(hoursAvailability, hours))
}
