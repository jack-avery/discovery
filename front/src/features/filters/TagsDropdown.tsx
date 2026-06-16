import type { Tag } from '@/types'
import { MultiSelectDropdown } from '@/components/shared/MultiSelectDropdown'
import { cn } from '@/utils/cn'

interface TagsDropdownProps {
  tags: Tag[]
  value?: string[]
  onChange?: (slugs: string[]) => void
  isLoading?: boolean
  error?: string | null
  disabled?: boolean
  floating?: boolean
  className?: string
}

export function TagsDropdown({
  tags,
  value = [],
  onChange,
  isLoading = false,
  error = null,
  disabled = false,
  floating = false,
  className,
}: TagsDropdownProps) {
  return (
    <MultiSelectDropdown
      label="Tags"
      items={tags}
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
