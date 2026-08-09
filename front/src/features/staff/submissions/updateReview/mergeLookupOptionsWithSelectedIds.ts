import type { LookupOption } from '@/features/submissions/form/LookupMultiSelect'

/**
 * Ensure selected IDs missing from the active catalog still appear as options
 * so reviewers can see and deselect historical/unknown IDs.
 */
export function mergeLookupOptionsWithSelectedIds(
  options: LookupOption[],
  selectedIds: number[],
  names?: Record<number, string>,
): LookupOption[] {
  const knownIds = new Set(options.map((option) => option.id))
  const extras: LookupOption[] = []
  const seenExtra = new Set<number>()

  for (const id of selectedIds) {
    if (knownIds.has(id) || seenExtra.has(id)) continue
    seenExtra.add(id)
    const resolved = names?.[id]?.trim()
    extras.push({
      id,
      name: resolved || `ID ${id}`,
    })
  }

  return extras.length === 0 ? options : [...options, ...extras]
}
