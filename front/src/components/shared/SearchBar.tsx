import { Search } from 'lucide-react'
import { Input } from '@/components/ui'

interface SearchBarProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
}

export function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search resources…',
}: SearchBarProps) {
  return (
    <div className="relative w-full">
      <label htmlFor="resource-search" className="sr-only">
        Search resources
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id="resource-search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        type="search"
        role="searchbox"
      />
    </div>
  )
}
