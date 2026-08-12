import type { Category, Resource, Tag } from '@/types'
import type { ResourceEmptyReason } from '@/features/resources'
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
  onCategoriesRetry?: () => void
  tags: Tag[]
  tagsLoading?: boolean
  tagsError?: string | null
  resources: Resource[]
  resourcesTotal: number
  resourcesLoading?: boolean
  resourcesError?: string | null
  resourcesEmptyReason?: ResourceEmptyReason
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
  onCategoriesRetry,
  tags,
  tagsLoading,
  tagsError,
  resources,
  resourcesTotal,
  resourcesLoading,
  resourcesError,
  resourcesEmptyReason,
}: DiscoverScreenProps) {
  return (
    <div className="workspace-content flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
      <SearchSection search={search} onSearchChange={onSearchChange} />
      <div
        data-tour="filters"
        className="flex flex-col gap-[var(--ds-workspace-section-gap)]"
      >
        <CategorySection
          categories={categories}
          selectedCategories={selectedCategories}
          onCategoriesChange={onCategoriesChange}
          isLoading={categoriesLoading}
          error={categoriesError}
          onRetry={onCategoriesRetry}
        />
        <AdvancedFiltersSection
          tags={tags}
          selectedFilters={selectedAdvancedFilters}
          onFiltersChange={onAdvancedFiltersChange}
          isLoading={tagsLoading}
          error={tagsError}
        />
      </div>
      <ResultsSummary
        totalItems={resourcesTotal}
        isLoading={resourcesLoading}
        error={resourcesError}
      />
      <ResultsList
        resources={resources}
        isLoading={resourcesLoading}
        error={resourcesError}
        emptyReason={resourcesEmptyReason}
      />
    </div>
  )
}
