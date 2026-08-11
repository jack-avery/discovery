import { skillsFollowUpStatusFilterOptions } from '@/features/staff/skillsFollowUps/skillsFollowUpStatusHelpers'
import { cn } from '@/utils/cn'
import type {
  SkillsFollowUpSort,
  SkillsFollowUpStatus,
} from '@/types/skillsFollowUp'

interface SkillsFollowUpsToolbarProps {
  sort: SkillsFollowUpSort
  statusFilter: SkillsFollowUpStatus | 'all'
  resultCount: number
  onSortChange: (sort: SkillsFollowUpSort) => void
  onStatusFilterChange: (status: SkillsFollowUpStatus | 'all') => void
}

const selectClassName = cn(
  'h-9 w-full rounded-lg border border-border bg-surface pl-2.5 pr-8 text-sm text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive/40 focus-visible:border-interactive',
)

const SORT_OPTIONS: { value: SkillsFollowUpSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]

const STATUS_FILTER_OPTIONS = skillsFollowUpStatusFilterOptions()

/**
 * Card header + status filter + date sort for the Skills Follow-ups list.
 */
export function SkillsFollowUpsToolbar({
  sort,
  statusFilter,
  resultCount,
  onSortChange,
  onStatusFilterChange,
}: SkillsFollowUpsToolbarProps) {
  return (
    <div className="space-y-3 border-b border-border px-4 py-4 sm:px-5">
      <div className="space-y-1">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Accepted for follow-up
        </h2>
        <p className="text-xs text-muted-foreground">
          {resultCount} follow-up{resultCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
        <label className="flex min-w-0 flex-col gap-1 sm:w-44">
          <span className="sr-only">Filter by status</span>
          <select
            value={statusFilter}
            aria-label="Filter by status"
            onChange={(event) =>
              onStatusFilterChange(
                event.target.value as SkillsFollowUpStatus | 'all',
              )
            }
            className={selectClassName}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1 sm:w-48">
          <span className="sr-only">Sort by date accepted</span>
          <select
            value={sort}
            aria-label="Sort by date accepted"
            onChange={(event) =>
              onSortChange(event.target.value as SkillsFollowUpSort)
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
