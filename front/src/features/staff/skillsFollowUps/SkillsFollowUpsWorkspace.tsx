import { useEffect, useState, type ReactNode } from 'react'
import { Handshake, Search } from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { Button, Card } from '@/components/ui'
import { SkillsFollowUpsTable } from '@/features/staff/skillsFollowUps/SkillsFollowUpsTable'
import { SkillsFollowUpsTableSkeleton } from '@/features/staff/skillsFollowUps/SkillsFollowUpsTableSkeleton'
import { SkillsFollowUpsToolbar } from '@/features/staff/skillsFollowUps/SkillsFollowUpsToolbar'
import { pageAfterStatusFilterChange } from '@/features/staff/skillsFollowUps/skillsFollowUpStatusHelpers'
import { UsersPagination } from '@/features/staff/users/UsersPagination'
import { useSkillsFollowUps } from '@/hooks/useSkillsFollowUps'
import type {
  SkillsFollowUpSort,
  SkillsFollowUpStatus,
} from '@/types/skillsFollowUp'

/**
 * Lightweight Skills Follow-ups workspace: filter, sort, table, expand-for-
 * contact/notes, and server-side pagination.
 */
export function SkillsFollowUpsWorkspace() {
  const [sort, setSort] = useState<SkillsFollowUpSort>('newest')
  const [statusFilter, setStatusFilter] = useState<
    SkillsFollowUpStatus | 'all'
  >('all')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    setPage(1)
    setExpandedId(null)
  }, [sort])

  useEffect(() => {
    setExpandedId(null)
  }, [page])

  const { items, pagination, isLoading, error, reload } = useSkillsFollowUps({
    sort,
    page,
    status: statusFilter,
  })

  const handleStatusFilterChange = (next: SkillsFollowUpStatus | 'all') => {
    setStatusFilter(next)
    setPage(pageAfterStatusFilterChange())
    setExpandedId(null)
  }

  const handleToggleExpand = (followUpId: number) => {
    setExpandedId((current) => (current === followUpId ? null : followUpId))
  }

  let body: ReactNode

  if (isLoading) {
    body = <SkillsFollowUpsTableSkeleton />
  } else if (error) {
    body = (
      <EmptyState
        title="Unable to load follow-ups"
        description={error}
        icon={<Search className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
        action={
          <Button type="button" variant="outline" size="sm" onClick={reload}>
            Try again
          </Button>
        }
      />
    )
  } else if (items.length === 0) {
    body =
      statusFilter === 'all' ? (
        <EmptyState
          title="No skills or services have been accepted for follow-up yet."
          description="When a Skills/Services submission is accepted for follow-up from Review Submissions, it will appear here."
          icon={
            <Handshake
              className="h-6 w-6 text-muted-foreground"
              strokeWidth={1.5}
            />
          }
        />
      ) : (
        <EmptyState
          title="No follow-ups match this status."
          description="Try another status filter, or choose All to see every accepted follow-up."
          icon={
            <Search className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          }
        />
      )
  } else {
    body = (
      <SkillsFollowUpsTable
        items={items}
        expandedId={expandedId}
        onToggleExpand={handleToggleExpand}
        onFollowUpUpdated={reload}
      />
    )
  }

  return (
    <Card className="overflow-hidden">
      <SkillsFollowUpsToolbar
        sort={sort}
        statusFilter={statusFilter}
        resultCount={isLoading ? 0 : pagination.total_items}
        onSortChange={setSort}
        onStatusFilterChange={handleStatusFilterChange}
      />
      {body}
      {!isLoading && !error ? (
        <UsersPagination pagination={pagination} onPageChange={setPage} />
      ) : null}
    </Card>
  )
}
