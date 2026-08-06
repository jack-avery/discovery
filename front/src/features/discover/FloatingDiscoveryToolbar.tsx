import type { Category } from '@/types'
import { CategoryChipGroup } from '@/features/discover/CategoryChipGroup'
import { FloatingSearchBar } from './FloatingSearchBar'
import { FLOATING_FILTER_BAR_Z_CLASS } from './constants'
import { cn } from '@/utils/cn'

interface FloatingDiscoveryToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  categories: Category[]
  selectedCategories: string[]
  onCategoriesChange: (slugs: string[]) => void
  categoriesLoading?: boolean
  categoriesError?: string | null
  onCategoriesRetry?: () => void
}

export function FloatingDiscoveryToolbar({
  search,
  onSearchChange,
  categories,
  selectedCategories,
  onCategoriesChange,
  categoriesLoading,
  categoriesError,
  onCategoriesRetry,
}: FloatingDiscoveryToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Discovery controls"
      className={cn(
        `pointer-events-none absolute top-3 ${FLOATING_FILTER_BAR_Z_CLASS} flex justify-center sm:top-4`,
        'left-3 right-3 sm:left-4 sm:right-4',
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-md flex-col items-center gap-1.5">
        <FloatingSearchBar search={search} onSearchChange={onSearchChange} />
        <CategoryChipGroup
          categories={categories}
          selectedCategories={selectedCategories}
          onCategoriesChange={onCategoriesChange}
          isLoading={categoriesLoading}
          error={categoriesError}
          onRetry={onCategoriesRetry}
        />
      </div>
    </div>
  )
}
