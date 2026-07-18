import type { Category, Tag } from '@/types'
import type { ResourceEmptyReason } from '@/features/resources'
import type { ResourceFilters } from '@/hooks/useResources'

export function getResourceEmptyReason(
  filters: ResourceFilters,
  hasResources: boolean,
): ResourceEmptyReason {
  if (hasResources) return 'none'

  if (filters.search?.trim()) return 'search'

  if (filters.categoryIds && filters.categoryIds.length > 0) return 'filter'
  if (filters.tagIds && filters.tagIds.length > 0) return 'filter'

  return 'none'
}

/** Map selected category slugs to backend category_id values. */
export function resolveCategoryIds(
  selectedSlugs: string[],
  categories: Category[],
): number[] {
  if (selectedSlugs.length === 0) return []
  return selectedSlugs
    .map((slug) => categories.find((category) => category.slug === slug)?.category_id)
    .filter((id): id is number => typeof id === 'number')
}

/** Map selected tag slugs to backend tag_id values. */
export function resolveTagIds(selectedSlugs: string[], tags: Tag[]): number[] {
  if (selectedSlugs.length === 0) return []
  return selectedSlugs
    .map((slug) => tags.find((tag) => tag.slug === slug)?.tag_id)
    .filter((id): id is number => typeof id === 'number')
}
