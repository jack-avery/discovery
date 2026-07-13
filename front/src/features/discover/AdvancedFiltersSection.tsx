import { FilterPopover } from '@/features/discover/FilterPopover'
import { PLACEHOLDER_ADVANCED_FILTERS } from '@/features/discover/placeholderAdvancedFilters'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'

interface AdvancedFiltersSectionProps {
  selectedFilters: string[]
  onFiltersChange: (slugs: string[]) => void
}

export function AdvancedFiltersSection({
  selectedFilters,
  onFiltersChange,
}: AdvancedFiltersSectionProps) {
  return (
    <WorkspaceSection title="Advanced filters">
      <FilterPopover
        label="Advanced filters"
        hideLabel
        items={[...PLACEHOLDER_ADVANCED_FILTERS]}
        value={selectedFilters}
        onChange={onFiltersChange}
        emptySummary="No filters selected"
      />
    </WorkspaceSection>
  )
}
