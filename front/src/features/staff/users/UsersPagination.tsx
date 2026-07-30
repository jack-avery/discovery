import { Button } from '@/components/ui'
import type { PaginationMeta } from '@/types/resource'
import { cn } from '@/utils/cn'

interface UsersPaginationProps {
  pagination: PaginationMeta
  onPageChange: (page: number) => void
}

/**
 * Simple prev/next pager aligned with PaginationMeta from the service layer.
 */
export function UsersPagination({
  pagination,
  onPageChange,
}: UsersPaginationProps) {
  const { page, total_pages, total_items, per_page, has_prev, has_next } =
    pagination

  if (total_items === 0 || total_pages <= 1) {
    return null
  }

  const rangeStart = (page - 1) * per_page + 1
  const rangeEnd = Math.min(page * per_page, total_items)

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5',
      )}
    >
      <p className="text-xs text-muted-foreground">
        Showing {rangeStart}–{rangeEnd} of {total_items}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!has_prev}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="min-w-[4.5rem] text-center text-xs text-muted-foreground">
          Page {page} of {total_pages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!has_next}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
