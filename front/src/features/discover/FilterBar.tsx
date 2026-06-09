import type { ReactNode } from 'react'
import type { Category, Tag } from '@/types'
import { SidebarToggle } from '@/components/shared/Sidebar'
import { SearchBar } from '@/components/shared'
import { CategoryFilter, type CategoryFilterValue, TagFilter } from '@/features/filters'

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  category: CategoryFilterValue
  onCategoryChange: (value: CategoryFilterValue) => void
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  categories: Category[]
  tags: Tag[]
  categoriesLoading?: boolean
  categoriesError?: string | null
  tagsLoading?: boolean
  tagsError?: string | null
  onSidebarOpen?: () => void
  /** Slot for future filters (accessibility, hours, distance, etc.) */
  futureFilters?: ReactNode
}

export function FilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  selectedTags,
  onTagsChange,
  categories,
  tags,
  categoriesLoading,
  categoriesError,
  tagsLoading,
  tagsError,
  onSidebarOpen,
  futureFilters,
}: FilterBarProps) {
  return (
    <div className="shrink-0 border-b border-border bg-surface px-4 py-3 sm:px-6">
      <div className="flex items-start gap-3">
        {onSidebarOpen && (
          <div className="pt-1 lg:hidden">
            <SidebarToggle onClick={onSidebarOpen} />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder="Search resources by name, category, or location…"
          />

          <CategoryFilter
            categories={categories}
            isLoading={categoriesLoading}
            error={categoriesError}
            active={category}
            onChange={onCategoryChange}
          />

          <TagFilter
            tags={tags}
            isLoading={tagsLoading}
            error={tagsError}
            active={selectedTags}
            onChange={onTagsChange}
          />

          {futureFilters}
        </div>
      </div>
    </div>
  )
}
