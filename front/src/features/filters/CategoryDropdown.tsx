import type { Category } from '@/types'
import { MultiSelectDropdown } from '@/components/shared/MultiSelectDropdown'
import { cn } from '@/utils/cn'

interface CategoryDropdownProps {
  categories: Category[]
  value?: string[]
  onChange?: (slugs: string[]) => void
  isLoading?: boolean
  error?: string | null
  disabled?: boolean
  floating?: boolean
  className?: string
}

export function CategoryDropdown({
  categories,
  value = [],
  onChange,
  isLoading = false,
  error = null,
  disabled = false,
  floating = false,
  className,
}: CategoryDropdownProps) {
  return (
    <MultiSelectDropdown
      label="Categories"
      items={categories}
      value={value}
      onChange={onChange}
      isLoading={isLoading}
      error={error}
      disabled={disabled}
      floating={floating}
      className={cn(className)}
    />
  )
}
