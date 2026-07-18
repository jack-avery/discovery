import type { SkillsServicesData } from '@/types/submission'

const AVAILABILITY_LABELS: Record<
  SkillsServicesData['availability'][number],
  string
> = {
  weekdays: 'Weekdays',
  evenings: 'Evenings',
  weekends: 'Weekends',
  flexible: 'Flexible',
}

export function buildSkillsServicesSummary(data: SkillsServicesData): {
  title: string
  summary: string
  highlights: string[]
} {
  const title = data.title.trim() || 'Untitled skills or services'
  const languages = data.languages.map((l) => l.trim()).filter(Boolean)
  const availability = data.availability.map((a) => AVAILABILITY_LABELS[a])

  const highlights = [
    ...availability.slice(0, 2),
    ...languages.slice(0, 2),
  ].filter(Boolean)

  const summaryParts = [
    availability.length > 0 ? availability.join(', ') : null,
    languages.length > 0 ? languages.slice(0, 2).join(', ') : null,
  ].filter(Boolean)

  return {
    title,
    summary: summaryParts.join(' · ') || 'Shared as a personal offer',
    highlights:
      highlights.length > 0 ? highlights : ['Personal offer'],
  }
}
