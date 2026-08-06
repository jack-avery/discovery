import type { Category } from '@/types'
import { MultiSelectDropdown } from '@/components/shared/MultiSelectDropdown'
import { cn } from '@/utils/cn'

interface CategoryDropdownProps {
  categories: Category[]
  value?: string[]
  onChange?: (slugs: string[]) => void
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  disabled?: boolean
  /** Trigger / empty-selection label (defaults to "Categories"). */
  label?: string
  /** Label for the clear-all menu option. */
  allOptionLabel?: string
  /** Borderless trigger for floating map chrome. */
  floating?: boolean
  className?: string
}

export function CategoryDropdown({
  categories,
  value = [],
  onChange,
  isLoading = false,
  error = null,
  onRetry,
  disabled = false,
  label = 'Categories',
  allOptionLabel,
  floating = false,
  className,
}: CategoryDropdownProps) {
  return (
    <MultiSelectDropdown
      label={label}
      allOptionLabel={allOptionLabel}
      items={categories}
      value={value}
      onChange={onChange}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      disabled={disabled}
      floating={floating}
      className={cn(className)}
    />
  )
}
