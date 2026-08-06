import type { Tag } from '@/types'
import { FilterPopover } from '@/features/discover/FilterPopover'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'

interface AdvancedFiltersSectionProps {
  tags: Tag[]
  selectedFilters: string[]
  onFiltersChange: (slugs: string[]) => void
  isLoading?: boolean
  error?: string | null
}

export function AdvancedFiltersSection({
  tags,
  selectedFilters,
  onFiltersChange,
  isLoading,
  error,
}: AdvancedFiltersSectionProps) {
  return (
    <WorkspaceSection title="Apply Filters">
      <FilterPopover
        label="Apply Filters"
        hideLabel
        items={tags}
        value={selectedFilters}
        onChange={onFiltersChange}
        emptySummary="No filters selected"
        isLoading={isLoading}
        error={error}
      />
    </WorkspaceSection>
  )
}
