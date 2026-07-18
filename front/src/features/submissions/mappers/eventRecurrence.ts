/**
 * Human-readable event recurrence helpers.
 * Used by the public event mapper (notes) and staff/public presentation.
 */

import type { EventFrequency, EventWeekday } from '@/types/submission'
import { FREQUENCY_LABELS } from './labels'
import { trimText } from './notes'

export const EVENT_WEEKDAY_OPTIONS: {
  value: EventWeekday
  label: string
}[] = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

const WEEKDAY_ORDER: EventWeekday[] = EVENT_WEEKDAY_OPTIONS.map((o) => o.value)

const WEEKDAY_DISPLAY: Record<EventWeekday, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

export function sortEventWeekdays(days: EventWeekday[]): EventWeekday[] {
  return [...days].sort(
    (a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b),
  )
}

export function formatWeekdayList(days: EventWeekday[]): string {
  const labels = sortEventWeekdays(days).map((day) => WEEKDAY_DISPLAY[day])
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`
}

/**
 * Build a human-readable recurrence phrase.
 * Examples: "Every Tuesday", "Every Monday & Wednesday",
 * "Every two weeks on Thursday", "Daily", "Monthly".
 */
export function formatRecurrencePhrase(input: {
  frequency: EventFrequency | null
  frequencyOther?: string | null
  weekdays?: EventWeekday[]
}): string | null {
  const { frequency, frequencyOther, weekdays = [] } = input
  if (!frequency) return null

  if (frequency === 'other') {
    return trimText(frequencyOther) || 'Custom schedule'
  }

  if (frequency === 'daily') return 'Daily'
  if (frequency === 'monthly') return 'Monthly'

  const dayList = formatWeekdayList(weekdays)
  if (frequency === 'weekly') {
    return dayList ? `Every ${dayList}` : 'Weekly'
  }
  if (frequency === 'biweekly') {
    return dayList
      ? `Every two weeks on ${dayList}`
      : 'Every two weeks'
  }

  return FREQUENCY_LABELS[frequency]
}

/** Serialize selected weekdays for the Event schedule notes block. */
export function formatOccursOnNoteLine(weekdays: EventWeekday[]): string | null {
  if (weekdays.length === 0) return null
  return `Occurs on: ${sortEventWeekdays(weekdays)
    .map((day) => WEEKDAY_DISPLAY[day])
    .join(', ')}`
}

export function parseOccursOnWeekdays(
  value: string | null | undefined,
): EventWeekday[] {
  const text = trimText(value)
  if (!text) return []

  const found: EventWeekday[] = []
  for (const option of EVENT_WEEKDAY_OPTIONS) {
    const pattern = new RegExp(`\\b${option.label}\\b`, 'i')
    if (pattern.test(text) && !found.includes(option.value)) {
      found.push(option.value)
    }
  }
  return sortEventWeekdays(found)
}

/**
 * Parse frequency note text ("Weekly", "Every two weeks", custom) into
 * a display phrase, combining with Occurs on weekdays when present.
 */
export function formatRecurrenceFromNotes(input: {
  frequencyRaw: string | null
  occursOnRaw: string | null
}): string | null {
  const frequencyRaw = trimText(input.frequencyRaw)
  const weekdays = parseOccursOnWeekdays(input.occursOnRaw)

  if (!frequencyRaw && weekdays.length === 0) return null

  const lower = frequencyRaw.toLowerCase()
  let frequency: EventFrequency | null = null
  let frequencyOther: string | null = null

  if (lower === 'daily') frequency = 'daily'
  else if (lower === 'weekly') frequency = 'weekly'
  else if (lower === 'every two weeks' || lower === 'biweekly') {
    frequency = 'biweekly'
  } else if (lower === 'monthly') frequency = 'monthly'
  else if (lower === 'other') {
    frequency = 'other'
    frequencyOther = frequencyRaw
  } else if (frequencyRaw) {
    // Legacy custom frequency text stored directly in Frequency:
    frequency = 'other'
    frequencyOther = frequencyRaw
  }

  return formatRecurrencePhrase({ frequency, frequencyOther, weekdays })
}

/**
 * True when a Recurrence end note value is a real end date (not Never / Not sure / After N).
 */
export function isConcreteRecurrenceEndDate(
  value: string | null | undefined,
): boolean {
  const text = trimText(value)
  if (!text) return false
  const lower = text.toLowerCase()
  if (
    lower === 'never' ||
    lower === 'no known end date' ||
    lower === 'not sure' ||
    lower === 'end date' ||
    lower === 'number of occurrences' ||
    /^after\s+\d+\s+occurrences?$/i.test(text)
  ) {
    return false
  }
  return true
}
