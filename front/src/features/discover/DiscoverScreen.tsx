import type { Category } from '@/types'
import { AdvancedFiltersSection } from './AdvancedFiltersSection'
import { CategorySection } from './CategorySection'
import { ResultsList } from './ResultsList'
import { ResultsSummary } from './ResultsSummary'
import { SearchSection } from './SearchSection'

export interface DiscoverScreenProps {
  search: string
  onSearchChange: (value: string) => void
  selectedCategories: string[]
  onCategoriesChange: (slugs: string[]) => void
  selectedAdvancedFilters: string[]
  onAdvancedFiltersChange: (slugs: string[]) => void
  categories: Category[]
  categoriesLoading?: boolean
  categoriesError?: string | null
}

export function DiscoverScreen({
  search,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  selectedAdvancedFilters,
  onAdvancedFiltersChange,
  categories,
  categoriesLoading,
  categoriesError,
}: DiscoverScreenProps) {
  return (
    <div className="workspace-content flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
      <SearchSection search={search} onSearchChange={onSearchChange} />
      <CategorySection
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoriesChange={onCategoriesChange}
        isLoading={categoriesLoading}
        error={categoriesError}
      />
      <AdvancedFiltersSection
        selectedFilters={selectedAdvancedFilters}
        onFiltersChange={onAdvancedFiltersChange}
      />
      <ResultsSummary />
      <ResultsList />
    </div>
  )
}
