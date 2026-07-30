import { Plus } from 'lucide-react'
import { SearchBar } from '@/components/shared'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { ROLE_LABELS } from '@/features/staff/users/userDisplay'
import type { StaffManageRole, UserSortField } from '@/types/user'

export type UsersRoleFilter = StaffManageRole | 'all'

interface UsersToolbarProps {
  search: string
  role: UsersRoleFilter
  includeInactive: boolean
  sort: UserSortField
  resultCount: number
  onSearchChange: (value: string) => void
  onRoleChange: (role: UsersRoleFilter) => void
  onIncludeInactiveChange: (includeInactive: boolean) => void
  onSortChange: (sort: UserSortField) => void
  onCreateUser: () => void
}

const ROLE_OPTIONS: { value: UsersRoleFilter; label: string }[] = [
  { value: 'all', label: 'All Roles' },
  { value: 'administrator', label: ROLE_LABELS.administrator },
  { value: 'staff_editor', label: ROLE_LABELS.staff_editor },
  { value: 'moderator', label: ROLE_LABELS.moderator },
]

const SORT_OPTIONS: { value: UserSortField; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'name', label: 'Alphabetical' },
  { value: 'created_at', label: 'Date Created' },
]

const selectClassName = cn(
  // Extra right padding gives the native chevron breathing room from the border.
  'h-9 w-full rounded-lg border border-border bg-surface pl-2.5 pr-8 text-sm text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive/40 focus-visible:border-interactive',
)

/**
 * Card header (title + Create User), count, and unlabeled toolbar controls.
 */
export function UsersToolbar({
  search,
  role,
  includeInactive,
  sort,
  resultCount,
  onSearchChange,
  onRoleChange,
  onIncludeInactiveChange,
  onSortChange,
  onCreateUser,
}: UsersToolbarProps) {
  return (
    <div className="space-y-3 border-b border-border px-4 py-4 sm:px-5">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 font-heading text-sm font-semibold text-foreground">
            Staff Accounts
          </h2>
          <Button
            type="button"
            variant="interactive"
            size="sm"
            className="shrink-0"
            onClick={onCreateUser}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create User
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {resultCount} user{resultCount === 1 ? '' : 's'}
          {includeInactive ? '' : ' (active)'}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder="Search by name or email…"
            label="Search staff users"
            compact
            inputId="staff-users-search"
            className="max-w-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:contents">
          <select
            value={role}
            aria-label="Role"
            onChange={(event) =>
              onRoleChange(event.target.value as UsersRoleFilter)
            }
            className={cn(selectClassName, 'lg:w-44 lg:shrink-0')}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sort}
            aria-label="Sort"
            onChange={(event) =>
              onSortChange(event.target.value as UserSortField)
            }
            className={cn(selectClassName, 'lg:w-44 lg:shrink-0')}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="inline-flex min-h-[var(--ds-min-touch)] w-full cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 sm:col-span-2 sm:min-h-0 lg:col-auto lg:w-auto lg:shrink-0">
            <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
              <input
                type="checkbox"
                role="switch"
                checked={includeInactive}
                onChange={(event) =>
                  onIncludeInactiveChange(event.target.checked)
                }
                className="peer sr-only"
              />
              <span
                className={cn(
                  'absolute inset-0 rounded-full transition-colors',
                  'bg-muted peer-checked:bg-interactive peer-focus-visible:ring-2 peer-focus-visible:ring-interactive/40',
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface transition-transform',
                  'peer-checked:translate-x-4',
                )}
                aria-hidden="true"
              />
            </span>
            <span className="whitespace-nowrap text-sm text-foreground">
              Show inactive users
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
