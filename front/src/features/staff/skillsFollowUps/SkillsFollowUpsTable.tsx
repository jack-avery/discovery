import { Fragment } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { SkillsFollowUpDetailPanel } from '@/features/staff/skillsFollowUps/SkillsFollowUpDetailPanel'
import { SkillsFollowUpStatusControl } from '@/features/staff/skillsFollowUps/SkillsFollowUpStatusControl'
import {
  usersTableBodyCellClass,
  usersTableHeaderCellClass,
} from '@/features/staff/users/usersTableStyles'
import {
  displaySkillName,
  displaySubmitterName,
  formatFollowUpAcceptedAt,
} from '@/services/skillsFollowUpService'
import type { SkillsFollowUpSummaryDto } from '@/types/skillsFollowUp'
import { cn } from '@/utils/cn'

interface SkillsFollowUpsTableProps {
  items: SkillsFollowUpSummaryDto[]
  expandedId: number | null
  onToggleExpand: (followUpId: number) => void
  onFollowUpUpdated: () => void
}

/**
 * Expandable follow-up table. Contact lives on the detail endpoint, so rows
 * expand in place rather than widening the table.
 */
export function SkillsFollowUpsTable({
  items,
  expandedId,
  onToggleExpand,
  onFollowUpUpdated,
}: SkillsFollowUpsTableProps) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th scope="col" className={usersTableHeaderCellClass}>
              Contributor
            </th>
            <th scope="col" className={usersTableHeaderCellClass}>
              Skill / service
            </th>
            <th scope="col" className={usersTableHeaderCellClass}>
              Status
            </th>
            <th scope="col" className={usersTableHeaderCellClass}>
              Accepted
            </th>
            <th
              scope="col"
              className={cn(usersTableHeaderCellClass, 'w-24 text-right')}
            >
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isExpanded = expandedId === item.follow_up_id
            const detailId = `skills-follow-up-detail-${item.follow_up_id}`

            return (
              <Fragment key={item.follow_up_id}>
                <tr
                  className={cn(
                    'border-b border-border hover:bg-muted/30',
                    isExpanded ? 'border-b-0 bg-muted/20' : 'last:border-b-0',
                  )}
                >
                  <td className={cn(usersTableBodyCellClass, 'min-w-0')}>
                    <span className="block truncate font-medium text-foreground">
                      {displaySubmitterName(item)}
                    </span>
                  </td>
                  <td className={cn(usersTableBodyCellClass, 'min-w-0')}>
                    <span className="block truncate text-foreground">
                      {displaySkillName(item)}
                    </span>
                  </td>
                  <td className={usersTableBodyCellClass}>
                    <SkillsFollowUpStatusControl
                      followUpId={item.follow_up_id}
                      status={item.status}
                      onUpdated={() => onFollowUpUpdated()}
                    />
                  </td>
                  <td
                    className={cn(
                      usersTableBodyCellClass,
                      'whitespace-nowrap text-muted-foreground',
                    )}
                  >
                    {formatFollowUpAcceptedAt(item.accepted_at)}
                  </td>
                  <td className={cn(usersTableBodyCellClass, 'text-right')}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-expanded={isExpanded}
                      aria-controls={detailId}
                      onClick={() => onToggleExpand(item.follow_up_id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      )}
                      {isExpanded ? 'Hide' : 'View'}
                    </Button>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr className="border-b border-border last:border-b-0">
                    <td
                      colSpan={5}
                      id={detailId}
                      className="bg-muted/10 px-4 py-4 sm:px-5"
                    >
                      <SkillsFollowUpDetailPanel
                        followUpId={item.follow_up_id}
                        listStatus={item.status}
                        onFollowUpUpdated={onFollowUpUpdated}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
