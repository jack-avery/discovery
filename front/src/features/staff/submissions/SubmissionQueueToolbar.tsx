import { cn } from '@/utils/cn'
import type {
  ReviewContributionFilter,
  ReviewQueueSort,
} from '@/features/staff/submissions/fetchReviewQueue'

interface SubmissionQueueToolbarProps {
  filter: ReviewContributionFilter
  sort: ReviewQueueSort
  onFilterChange: (filter: ReviewContributionFilter) => void
  onSortChange: (sort: ReviewQueueSort) => void
  count: number
}

const FILTER_OPTIONS: { value: ReviewContributionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'existing_resource', label: 'Existing Resource' },
  { value: 'event', label: 'Event' },
  { value: 'skill', label: 'Skills / Services' },
]

const SORT_OPTIONS: { value: ReviewQueueSort; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
]

/**
 * Contribution type filter + sort controls for the pending queue.
 */
export function SubmissionQueueToolbar({
  filter,
  sort,
  onFilterChange,
  onSortChange,
  count,
}: SubmissionQueueToolbarProps) {
  return (
    <div className="shrink-0 space-y-2.5 border-b border-border px-3 py-2.5">
      <div>
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Review queue
        </h2>
        <p className="text-xs text-muted-foreground">
          {count} submission{count === 1 ? '' : 's'} waiting
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Contribution type
          </span>
          <select
            value={filter}
            onChange={(event) =>
              onFilterChange(event.target.value as ReviewContributionFilter)
            }
            className={selectClassName}
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Sort
          </span>
          <select
            value={sort}
            onChange={(event) =>
              onSortChange(event.target.value as ReviewQueueSort)
            }
            className={selectClassName}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

const selectClassName = cn(
  'h-9 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive/40 focus-visible:border-interactive',
)
