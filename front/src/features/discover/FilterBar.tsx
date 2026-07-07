import { SlidersHorizontal } from 'lucide-react'
import { useSelection } from '@/app/providers/SelectionProvider'
import type { Category, Tag } from '@/types'
import { SidebarToggle } from '@/components/shared/Sidebar'
import { SearchBar } from '@/components/shared'
import { CategoryDropdown, TagsDropdown } from '@/features/filters'
import { Button } from '@/components/ui'
import { useMediaQuery } from '@/hooks'
import { FLOATING_FILTER_BAR_Z_CLASS } from '@/features/discover/constants'
import { getMapBehaviour } from '@/features/map/config'
import { FloatingControlBubble } from '@/features/discover/FloatingControlBubble'
import { cn } from '@/utils/cn'

export interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  selectedCategories: string[]
  onCategoriesChange: (slugs: string[]) => void
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  categories: Category[]
  tags: Tag[]
  categoriesLoading?: boolean
  categoriesError?: string | null
  tagsLoading?: boolean
  tagsError?: string | null
  onSidebarOpen?: () => void
}

export function FilterBar({
  search,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  selectedTags,
  onTagsChange,
  categories,
  tags,
  categoriesLoading,
  categoriesError,
  tagsLoading,
  tagsError,
  onSidebarOpen,
}: FilterBarProps) {
  const { selectedResourceId } = useSelection()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isPanelOpen = selectedResourceId !== null
  const recenterForPanel = isPanelOpen && !isMobile
  const { panel } = getMapBehaviour()

  return (
    <div
      role="toolbar"
      aria-label="Map filters"
      className={cn(
        `pointer-events-none absolute top-3 ${FLOATING_FILTER_BAR_Z_CLASS} flex justify-center sm:top-4`,
        'left-3 sm:left-4 md:left-14 lg:left-16',
        !recenterForPanel && 'right-3 sm:right-4',
      )}
      style={{
        transitionProperty: 'right',
        transitionDuration: `${panel.recenterTransitionDurationMs}ms`,
        transitionTimingFunction: 'ease-out',
        ...(recenterForPanel ? { right: panel.detailPanelWidth } : {}),
      }}
    >
      <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5 md:flex-nowrap">
        {onSidebarOpen && (
          <FloatingControlBubble className="w-9 shrink-0 justify-center px-0 lg:hidden">
            <SidebarToggle onClick={onSidebarOpen} />
          </FloatingControlBubble>
        )}

        <div
          className={cn(
            'grid w-full max-w-full gap-1.5',
            'grid-cols-1 sm:grid-cols-2',
            'md:w-[min(100%,42rem)] md:grid-cols-[2.6fr_1fr_1fr_0.85fr] md:flex-none',
          )}
        >
          <FloatingControlBubble className="min-w-0 sm:col-span-2 md:col-span-1">
            <SearchBar
              value={search}
              onChange={onSearchChange}
              placeholder="Search resources…"
              floating
            />
          </FloatingControlBubble>

          <div className="pointer-events-auto min-w-0">
            <CategoryDropdown
              categories={categories}
              value={selectedCategories}
              onChange={onCategoriesChange}
              isLoading={categoriesLoading}
              error={categoriesError}
              floating
            />
          </div>

          <div className="pointer-events-auto min-w-0">
            <TagsDropdown
              tags={tags}
              value={selectedTags}
              onChange={onTagsChange}
              isLoading={tagsLoading}
              error={tagsError}
              floating
            />
          </div>

          <FloatingControlBubble className="min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-full min-h-0 w-full shrink-0 gap-1.5 rounded-none px-2.5 text-sm hover:bg-muted/60"
              disabled
              aria-label="Additional filters — coming soon"
              title="Additional filters coming soon"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </FloatingControlBubble>
        </div>
      </div>
    </div>
  )
}
