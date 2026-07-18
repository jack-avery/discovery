/** Empty selection represents "All" — no filtering applied. */
export function isAllSelected(selected: string[]): boolean {
  return selected.length === 0
}

export function getFilterTriggerLabel(baseLabel: string, selected: string[]): string {
  if (isAllSelected(selected)) return baseLabel
  return `${baseLabel} (${selected.length})`
}

interface FilterSummaryItem {
  slug: string
  name: string
}

export function getSelectedItemNames(
  selected: string[],
  items: FilterSummaryItem[],
): string[] {
  return selected
    .map((slug) => items.find((item) => item.slug === slug)?.name)
    .filter((name): name is string => Boolean(name))
}

interface FilterSelectionSummaryOptions {
  emptyLabel?: string
  /** How many names to show before collapsing to "+N". */
  maxVisibleNames?: number
}

/**
 * Human-readable summary for a closed multi-select filter control.
 * Examples: "No categories selected", "Housing", "Housing, Employment +2"
 */
export function getFilterSelectionSummary(
  selected: string[],
  items: FilterSummaryItem[],
  options: FilterSelectionSummaryOptions = {},
): string {
  const { emptyLabel = 'None selected', maxVisibleNames = 2 } = options

  if (selected.length === 0) return emptyLabel

  const names = selected
    .map((slug) => items.find((item) => item.slug === slug)?.name)
    .filter((name): name is string => Boolean(name))

  if (names.length === 0) return emptyLabel
  if (names.length === 1) return names[0]
  if (names.length === 2 && maxVisibleNames >= 2) return `${names[0]}, ${names[1]}`

  if (names.length <= maxVisibleNames) {
    return names.join(', ')
  }

  const visible = names.slice(0, maxVisibleNames).join(', ')
  const remaining = names.length - maxVisibleNames
  return `${visible} +${remaining}`
}

/**
 * Toggle a filter item. Passing `'all'` clears the selection.
 * Selecting every item collapses back to "All" (empty array).
 */
export function toggleFilterSelection(
  current: string[],
  slug: string | 'all',
  allSlugs: string[],
): string[] {
  if (slug === 'all') return []

  if (current.includes(slug)) {
    return current.filter((s) => s !== slug)
  }

  const next = [...current, slug]
  if (next.length === allSlugs.length) return []

  return next
}
