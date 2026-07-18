import type { Category, Tag } from '@/types'
import type { EventContributionData } from '@/types/submission'

const FREQUENCY_LABELS: Record<
  NonNullable<EventContributionData['frequency']>,
  string
> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every two weeks',
  monthly: 'Monthly',
  other: 'Custom schedule',
}

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
    const freq =
      data.frequency === 'other' && data.frequencyOther.trim()
        ? data.frequencyOther.trim()
        : data.frequency
          ? FREQUENCY_LABELS[data.frequency]
          : 'Recurring'
    const first = formatDisplayDate(data.startDate)
    return first ? `Recurring ${freq.toLowerCase()} · from ${first}` : `Recurring · ${freq}`
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
