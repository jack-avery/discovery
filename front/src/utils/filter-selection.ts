/** Empty selection represents "All" — no filtering applied. */
export function isAllSelected(selected: string[]): boolean {
  return selected.length === 0
}

export function getFilterTriggerLabel(baseLabel: string, selected: string[]): string {
  if (isAllSelected(selected)) return baseLabel
  return `${baseLabel} (${selected.length})`
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
