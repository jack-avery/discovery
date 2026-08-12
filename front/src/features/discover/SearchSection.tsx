import { SearchBar } from '@/components/shared'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'

interface SearchSectionProps {
  search: string
  onSearchChange: (value: string) => void
}

export function SearchSection({ search, onSearchChange }: SearchSectionProps) {
  return (
    <WorkspaceSection aria-label="Search resources" data-tour="search">
      <SearchBar
        value={search}
        onChange={onSearchChange}
        placeholder="Search resources…"
        compact
        inputId="resource-search-workspace"
      />
    </WorkspaceSection>
  )
}
