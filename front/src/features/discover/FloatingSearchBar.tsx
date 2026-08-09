import { SearchBar } from '@/components/shared'
import { useWorkspace } from '@/features/discover/providers/WorkspaceProvider'
import { FloatingControlBubble } from '@/features/discover/FloatingControlBubble'
import { cn } from '@/utils/cn'

interface FloatingSearchBarProps {
  search: string
  onSearchChange: (value: string) => void
  className?: string
}

const WORKSPACE_SEARCH_INPUT_ID = 'resource-search-workspace'

/**
 * Map overlay search. Focusing/clicking expands the Discover workspace and
 * moves focus into the workspace search input so typing continues uninterrupted.
 */
export function FloatingSearchBar({
  search,
  onSearchChange,
  className,
}: FloatingSearchBarProps) {
  const { expand, isExpanded } = useWorkspace()

  const openWorkspaceForSearch = () => {
    if (isExpanded) return
    expand()
    // Floating search unmounts when expanded; hand focus to the workspace field.
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        document.getElementById(WORKSPACE_SEARCH_INPUT_ID)?.focus()
      }, 50)
    })
  }

  return (
    <FloatingControlBubble className={cn('w-full', className)}>
      <SearchBar
        value={search}
        onChange={onSearchChange}
        onFocus={openWorkspaceForSearch}
        placeholder="Search resources…"
        floating
        inputId="resource-search-floating"
      />
    </FloatingControlBubble>
  )
}
