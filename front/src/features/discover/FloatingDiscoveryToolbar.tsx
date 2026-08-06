import type { Category } from '@/types'
import { StaffSessionControls } from '@/components/shared/StaffSessionControls'
import { CategoryDropdown } from '@/features/filters'
import { FloatingControlBubble } from '@/features/discover/FloatingControlBubble'
import { FloatingSearchBar } from './FloatingSearchBar'
import { FLOATING_FILTER_BAR_Z_CLASS } from './constants'
import { cn } from '@/utils/cn'

interface FloatingDiscoveryToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  categories: Category[]
  selectedCategories: string[]
  onCategoriesChange: (slugs: string[]) => void
  categoriesLoading?: boolean
  categoriesError?: string | null
  onCategoriesRetry?: () => void
}

/**
 * Map-top discovery controls: search, category filter, and staff session chip.
 *
 * Desktop/tablet: one row — search (flex) | categories | (≥16px gap) | staff.
 * Mobile: search full width, then categories (left) + staff (right).
 * Left padding clears Leaflet zoom controls.
 */
export function FloatingDiscoveryToolbar({
  search,
  onSearchChange,
  categories,
  selectedCategories,
  onCategoriesChange,
  categoriesLoading,
  categoriesError,
  onCategoriesRetry,
}: FloatingDiscoveryToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Discovery controls"
      className={cn(
        `pointer-events-none absolute top-3 ${FLOATING_FILTER_BAR_Z_CLASS} sm:top-4`,
        // Clear Leaflet zoom (top-left); keep right inset for map edge breathing room.
        'left-3 right-3 pl-12 sm:left-4 sm:right-4 sm:pl-14',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto flex w-full flex-col gap-2',
          'md:flex-row md:items-center md:gap-2',
        )}
      >
        <FloatingSearchBar
          search={search}
          onSearchChange={onSearchChange}
          className="min-w-0 w-full md:flex-1"
        />

        <div
          className={cn(
            'flex w-full items-center justify-between gap-4',
            'md:w-auto md:shrink-0 md:justify-start',
          )}
        >
          <FloatingControlBubble className="min-w-0 max-w-[min(100%,12.5rem)] flex-1 md:w-[12.5rem] md:flex-none">
            <CategoryDropdown
              categories={categories}
              value={selectedCategories}
              onChange={onCategoriesChange}
              isLoading={categoriesLoading}
              error={categoriesError}
              onRetry={onCategoriesRetry}
              label="All Categories"
              allOptionLabel="All Categories"
              floating
              className="w-full"
            />
          </FloatingControlBubble>

          <FloatingControlBubble className="shrink-0 px-2">
            <StaffSessionControls />
          </FloatingControlBubble>
        </div>
      </div>
    </div>
  )
}
