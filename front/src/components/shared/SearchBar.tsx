import { Search } from 'lucide-react'
import { Input } from '@/components/ui'
import { cn } from '@/utils/cn'

interface SearchBarProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  compact?: boolean
  /** Borderless styling for use inside a floating control bubble. */
  floating?: boolean
  className?: string
}

export function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search resources…',
  compact = false,
  floating = false,
  className,
}: SearchBarProps) {
  return (
    <div className={cn('relative w-full', floating && 'h-full', className)}>
      <label htmlFor="resource-search" className="sr-only">
        Search resources
      </label>
      <Search
        className={cn(
          'pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground',
          floating ? 'left-2.5' : 'left-3',
        )}
        aria-hidden="true"
      />
      <Input
        id="resource-search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'text-sm',
          floating ? 'h-full rounded-none py-0 pl-8 pr-2.5' : 'pl-9',
          compact && !floating && 'h-9',
          floating &&
            'border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0',
        )}
        type="search"
        role="searchbox"
      />
    </div>
  )
}
