import { FolderOpen, Loader2 } from 'lucide-react'
import type { Category } from '@/types'
import { EmptyState } from '@/components/shared'
import { cn } from '@/utils/cn'

export type CategoryFilterValue = 'all' | string

interface CategoryFilterProps {
  categories: Category[]
  isLoading?: boolean
  error?: string | null
  active?: CategoryFilterValue
  onChange?: (slug: CategoryFilterValue) => void
  disabled?: boolean
}

export function CategoryFilter({
  categories,
  isLoading = false,
  error = null,
  active = 'all',
  onChange,
  disabled = false,
}: CategoryFilterProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2" role="status" aria-label="Loading categories">
        <Loader2 className="h-4 w-4 animate-spin text-interactive" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Loading categories…</span>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="Unable to load categories"
        description={error}
        icon={<FolderOpen className="h-6 w-6 text-danger" strokeWidth={1.5} />}
        className="py-8"
      />
    )
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="No categories available"
        description="Resource categories will appear here once they are configured."
        icon={<FolderOpen className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
        className="py-8"
      />
    )
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filter resources by category"
    >
      <FilterChip
        label="All"
        isActive={active === 'all'}
        disabled={disabled}
        onClick={() => onChange?.('all')}
      />
      {categories.map((category) => (
        <FilterChip
          key={category.id}
          label={category.name}
          isActive={active === category.slug}
          disabled={disabled}
          onClick={() => onChange?.(category.slug)}
        />
      ))}
    </div>
  )
}

interface FilterChipProps {
  label: string
  isActive: boolean
  disabled?: boolean
  onClick: () => void
}

function FilterChip({ label, isActive, disabled, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-2 text-xs font-medium transition-colors focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        isActive
          ? 'bg-interactive text-interactive-foreground shadow-sm'
          : 'border border-border bg-surface text-muted-foreground hover:border-interactive/40 hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}
