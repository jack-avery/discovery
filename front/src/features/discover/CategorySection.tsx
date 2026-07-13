import type { Category } from '@/types'
import { FilterPopover } from '@/features/discover/FilterPopover'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'

interface CategorySectionProps {
  categories: Category[]
  selectedCategories: string[]
  onCategoriesChange: (slugs: string[]) => void
  isLoading?: boolean
  error?: string | null
}

export function CategorySection({
  categories,
  selectedCategories,
  onCategoriesChange,
  isLoading,
  error,
}: CategorySectionProps) {
  return (
    <WorkspaceSection title="Browse by Category">
      <FilterPopover
        label="Browse by Category"
        hideLabel
        items={categories}
        value={selectedCategories}
        onChange={onCategoriesChange}
        emptySummary="No categories selected"
        isLoading={isLoading}
        error={error}
      />
    </WorkspaceSection>
  )
}
