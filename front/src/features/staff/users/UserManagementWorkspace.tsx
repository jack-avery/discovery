import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle, Search, Users } from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { Button, Card } from '@/components/ui'
import { useUsers } from '@/hooks/useUsers'
import { UsersPagination } from '@/features/staff/users/UsersPagination'
import { UsersTable } from '@/features/staff/users/UsersTable'
import { UsersTableSkeleton } from '@/features/staff/users/UsersTableSkeleton'
import { UsersToolbar, type UsersRoleFilter } from '@/features/staff/users/UsersToolbar'
import type { UserSortField } from '@/types/user'

/**
 * Full User Management workspace: toolbar, table, pagination, and list states.
 */
export function UserManagementWorkspace() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [role, setRole] = useState<UsersRoleFilter>('all')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [sort, setSort] = useState<UserSortField>('default')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
    }, 200)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, role, includeInactive, sort])

  const { users, pagination, isLoading, error, reload } = useUsers({
    search: debouncedSearch,
    role,
    includeInactive,
    sort,
    page,
  })

  const hasActiveQuery =
    debouncedSearch.trim().length > 0 || role !== 'all'

  let body: ReactNode

  if (isLoading) {
    body = <UsersTableSkeleton />
  } else if (error) {
    body = (
      <div className="flex min-h-[16rem] items-center justify-center px-4 py-8">
        <EmptyState
          title="Unable to load users"
          description={error}
          icon={
            <AlertCircle className="h-6 w-6 text-danger" strokeWidth={1.5} />
          }
          action={
            <Button type="button" variant="interactive" size="sm" onClick={reload}>
              Try again
            </Button>
          }
        />
      </div>
    )
  } else if (users.length === 0) {
    body = (
      <div className="flex min-h-[16rem] items-center justify-center px-4 py-8">
        {hasActiveQuery ? (
          <EmptyState
            title="No matching users"
            description="No staff accounts match your search. Try different keywords or clear the search."
            icon={
              <Search className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            }
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setDebouncedSearch('')
                  setRole('all')
                }}
              >
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No users yet"
            description="Staff accounts will appear here once they are created."
            icon={
              <Users className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            }
          />
        )}
      </div>
    )
  } else {
    body = (
      <>
        <UsersTable users={users} />
        <UsersPagination pagination={pagination} onPageChange={setPage} />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage staff accounts and permissions.
      </p>

      <Card className="overflow-hidden shadow-sm">
        <UsersToolbar
          search={search}
          role={role}
          includeInactive={includeInactive}
          sort={sort}
          resultCount={isLoading || error ? 0 : pagination.total_items}
          onSearchChange={setSearch}
          onRoleChange={setRole}
          onIncludeInactiveChange={setIncludeInactive}
          onSortChange={setSort}
        />
        {body}
      </Card>
    </div>
  )
}
