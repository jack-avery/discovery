import type { ResourceEmptyReason } from '@/features/resources'
import type { ResourceFilters } from '@/hooks/useResources'

export function getResourceEmptyReason(
  filters: ResourceFilters,
  hasResources: boolean,
): ResourceEmptyReason {
  if (hasResources) return 'none'

  if (filters.search?.trim()) return 'search'

  if (filters.categorySlugs && filters.categorySlugs.length > 0) return 'filter'
  if (filters.tagSlugs && filters.tagSlugs.length > 0) return 'filter'

  return 'none'
}
