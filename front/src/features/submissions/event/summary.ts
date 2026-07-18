import type { Category, Tag } from '@/types'
import type { EventContributionData } from '@/types/submission'
import { formatRecurrencePhrase } from '@/features/submissions/mappers/eventRecurrence'

function formatDisplayDate(iso: string): string {
  if (!iso.trim()) return ''
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-CA', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildScheduleLabel(data: EventContributionData): string {
  if (data.scheduleKind === 'one_time') {
    const date = formatDisplayDate(data.startDate)
    return date ? `One-time · ${date}` : 'One-time'
  }
  if (data.scheduleKind === 'recurring') {
    const phrase =
      formatRecurrencePhrase({
        frequency: data.frequency,
        frequencyOther: data.frequencyOther,
        weekdays: data.recurrenceWeekdays,
      }) || 'Recurring'
    const first = formatDisplayDate(data.startDate)
    const until =
      data.recurrenceEndKind === 'end_date'
        ? formatDisplayDate(data.recurrenceEndDate)
        : ''
    const parts = [phrase]
    if (first) parts.push(`from ${first}`)
    if (until) parts.push(`until ${until}`)
    return parts.join(' · ')
  }
  return ''
}

function buildLocationLabel(data: EventContributionData): string {
  if (data.accessMode === 'online') return 'Online'
  if (data.accessMode === 'both') {
    const first = data.locations[0]
    const name = first?.locationName.trim() || first?.city.trim()
    if (data.locations.length > 1) {
      return name
        ? `${name} + ${data.locations.length - 1} more · Online`
        : `${data.locations.length} locations · Online`
    }
    return name ? `${name} · Online` : 'Physical and online'
  }
  if (data.accessMode === 'physical') {
    const first = data.locations[0]
    const name = first?.locationName.trim() || first?.city.trim()
    if (data.locations.length > 1) {
      return name
        ? `${name} + ${data.locations.length - 1} more`
        : `${data.locations.length} locations`
    }
    return name || 'Physical location'
  }
  return ''
}

export function buildEventContributionSummary(
  data: EventContributionData,
  categories: Category[],
  _tags: Tag[],
): { title: string; summary: string; highlights: string[] } {
  const title = data.name.trim() || 'Untitled event'
  const categoryNames = categories
    .filter((c) => data.categoryIds.includes(c.category_id))
    .map((c) => c.name)

  const schedule = buildScheduleLabel(data)
  const location = buildLocationLabel(data)

  const highlights = [
    schedule,
    location,
    ...categoryNames.slice(0, 2),
  ].filter(Boolean)

  const summaryParts = [schedule, location].filter(Boolean)

  return {
    title,
    summary: summaryParts.join(' · ') || 'Event details saved',
    highlights,
  }
}
