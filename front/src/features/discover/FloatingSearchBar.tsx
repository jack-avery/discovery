import { SearchBar } from '@/components/shared'
import { FloatingControlBubble } from '@/features/discover/FloatingControlBubble'

interface FloatingSearchBarProps {
  search: string
  onSearchChange: (value: string) => void
}

export function FloatingSearchBar({ search, onSearchChange }: FloatingSearchBarProps) {
  return (
    <FloatingControlBubble className="w-full">
      <SearchBar
        value={search}
        onChange={onSearchChange}
        placeholder="Search resources…"
        floating
        inputId="resource-search-floating"
      />
    </FloatingControlBubble>
  )
}
