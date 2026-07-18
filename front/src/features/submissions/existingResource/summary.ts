import type { Category, Tag } from '@/types'
import type { ExistingResourceData } from '@/types/submission'

export function buildAccessSummaryLabel(data: ExistingResourceData): string {
  const count = data.locations.length
  const first = data.locations[0]
  const firstLabel =
    first?.locationName.trim() || first?.city.trim() || null

  if (data.accessMode === 'online') {
    return 'Online only'
  }

  if (data.accessMode === 'both') {
    if (count <= 1) {
      return firstLabel
        ? `${firstLabel} and online`
        : '1 physical location and online'
    }
    if (firstLabel && count > 1) {
      return `${firstLabel} + ${count - 1} more location${count - 1 === 1 ? '' : 's'} and online`
    }
    return `${count} physical locations and online`
  }

  // physical
  if (count <= 0) return 'Physical location'
  if (count === 1) {
    return firstLabel || '1 physical location'
  }
  if (firstLabel) {
    return `${firstLabel} + ${count - 1} more location${count - 1 === 1 ? '' : 's'}`
  }
  return `${count} physical locations`
}

export function buildExistingResourceSummary(
  data: ExistingResourceData,
  categories: Category[],
  _tags: Tag[],
): { title: string; summary: string; highlights: string[] } {
  const title = data.name.trim() || 'Untitled resource'
  const categoryNames = categories
    .filter((c) => data.categoryIds.includes(c.category_id))
    .map((c) => c.name)

  const accessLabel = buildAccessSummaryLabel(data)

  const highlights = [...categoryNames.slice(0, 3), accessLabel].filter(Boolean)

  const summaryParts = [
    categoryNames.slice(0, 2).join(' · '),
    accessLabel,
  ].filter(Boolean)

  return {
    title,
    summary: summaryParts.join(' · '),
    highlights,
  }
}
