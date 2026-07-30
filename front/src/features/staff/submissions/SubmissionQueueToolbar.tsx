import { MultiSelectDropdown } from '@/components/shared/MultiSelectDropdown'
import { cn } from '@/utils/cn'
import {
  REVIEW_CONTRIBUTION_KIND_OPTIONS,
  type ReviewContributionKind,
  type ReviewQueueSort,
} from '@/features/staff/submissions/fetchReviewQueue'

interface SubmissionQueueToolbarProps {
  /** Empty array = All contribution types. */
  filters: ReviewContributionKind[]
  sort: ReviewQueueSort
  onFiltersChange: (filters: ReviewContributionKind[]) => void
  onSortChange: (sort: ReviewQueueSort) => void
  count: number
}

const FILTER_ITEMS = REVIEW_CONTRIBUTION_KIND_OPTIONS.map((option) => ({
  id: option.value,
  slug: option.value,
  name: option.label,
}))

const SORT_OPTIONS: { value: ReviewQueueSort; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
]

/**
 * Contribution type filter + sort controls for the pending queue.
 */
export function SubmissionQueueToolbar({
  filters,
  sort,
  onFiltersChange,
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
        <div className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Contribution type
          </span>
          <MultiSelectDropdown
            label="Contribution type"
            items={FILTER_ITEMS}
            value={filters}
            onChange={(slugs) =>
              onFiltersChange(slugs as ReviewContributionKind[])
            }
            className="w-full"
          />
        </div>

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
