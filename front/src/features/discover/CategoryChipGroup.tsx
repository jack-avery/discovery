import { FolderOpen, Loader2 } from 'lucide-react'
import type { Category } from '@/types'
import { EmptyState } from '@/components/shared'
import { Button } from '@/components/ui'
import { CategoryChip } from '@/features/discover/CategoryChip'
import { toggleFilterSelection } from '@/utils/filter-selection'
import { cn } from '@/utils/cn'

interface CategoryChipGroupProps {
  categories: Category[]
  selectedCategories: string[]
  onCategoriesChange: (slugs: string[]) => void
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  className?: string
}

export function CategoryChipGroup({
  categories,
  selectedCategories,
  onCategoriesChange,
  isLoading = false,
  error = null,
  onRetry,
  className,
}: CategoryChipGroupProps) {
  const allSlugs = categories.map((category) => category.slug)

  const handleToggle = (slug: string) => {
    onCategoriesChange(toggleFilterSelection(selectedCategories, slug, allSlugs))
  }

  if (isLoading) {
    return (
      <div
        className={cn('flex items-center gap-2 py-1', className)}
        role="status"
        aria-label="Loading categories"
      >
        <Loader2 className="h-4 w-4 animate-spin text-interactive" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Loading categories…</span>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="Couldn't load categories"
        description={error}
        icon={<FolderOpen className="h-6 w-6 text-danger" strokeWidth={1.5} />}
        className="py-6"
        action={
          onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : undefined
        }
      />
    )
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="No categories available"
        description="Resource categories will appear here once they are configured."
        icon={<FolderOpen className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
        className="py-6"
      />
    )
  }

  return (
    <div
      className={cn('w-full overflow-x-auto scrollbar-thin', className)}
      role="group"
      aria-label="Filter resources by category"
    >
      <div className="flex w-max min-w-full justify-center gap-2 px-4 pb-0.5">
        {categories.map((category) => (
          <CategoryChip
            key={category.id}
            label={category.name}
            isSelected={selectedCategories.includes(category.slug)}
            onToggle={() => handleToggle(category.slug)}
          />
        ))}
      </div>
    </div>
  )
}
