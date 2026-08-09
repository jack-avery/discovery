import type { DayHours, HoursAvailability } from '@/types/submission'

/**
 * Canonical hours snapshot for semantic equality (form dirty detection,
 * moderation structured edits, Current→Proposed `changed`, etc.).
 *
 * Aligns with publish mapping in `mapPublicHours` / `buildHoursNoteSections`:
 * - non-`structured` availability ignores leftover day rows
 * - closed / by-appointment days ignore opensAt/closesAt (not published as times)
 * - day order is normalized by `dayOfWeek` (first occurrence wins on duplicates)
 */
export type CanonicalDayHours = {
  dayOfWeek: number
  isClosed: boolean
  byAppointment: boolean
  opensAt: string
  closesAt: string
}

export type CanonicalHours = {
  hoursAvailability: HoursAvailability
  hours: CanonicalDayHours[]
}

export type HoursSlice = {
  hoursAvailability: HoursAvailability
  hours: DayHours[]
}

export function canonicalizeHours(slice: HoursSlice): CanonicalHours {
  if (slice.hoursAvailability !== 'structured') {
    return {
      hoursAvailability: slice.hoursAvailability,
      hours: [],
    }
  }

  const byDay = new Map<number, CanonicalDayHours>()

  for (const day of slice.hours) {
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) continue
    if (byDay.has(day.dayOfWeek)) continue

    if (day.isClosed) {
      byDay.set(day.dayOfWeek, {
        dayOfWeek: day.dayOfWeek,
        isClosed: true,
        byAppointment: false,
        opensAt: '',
        closesAt: '',
      })
      continue
    }

    if (day.byAppointment) {
      byDay.set(day.dayOfWeek, {
        dayOfWeek: day.dayOfWeek,
        isClosed: false,
        byAppointment: true,
        opensAt: '',
        closesAt: '',
      })
      continue
    }

    byDay.set(day.dayOfWeek, {
      dayOfWeek: day.dayOfWeek,
      isClosed: false,
      byAppointment: false,
      opensAt: day.opensAt.trim(),
      closesAt: day.closesAt.trim(),
    })
  }

  return {
    hoursAvailability: 'structured',
    hours: [...byDay.values()].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
  }
}

/** True when two hours slices are semantically equivalent. */
export function areHoursEquivalent(a: HoursSlice, b: HoursSlice): boolean {
  return (
    JSON.stringify(canonicalizeHours(a)) ===
    JSON.stringify(canonicalizeHours(b))
  )
}
