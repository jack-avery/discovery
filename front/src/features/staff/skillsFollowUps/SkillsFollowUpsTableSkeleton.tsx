import {
  usersTableBodyCellClass,
  usersTableHeaderCellClass,
} from '@/features/staff/users/usersTableStyles'

/**
 * Pulse skeleton matching SkillsFollowUpsTable columns.
 */
export function SkillsFollowUpsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className="overflow-x-auto scrollbar-thin"
      role="status"
      aria-label="Loading skills follow-ups"
    >
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
            <th scope="col" className={usersTableHeaderCellClass}>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, index) => (
            <tr key={index} className="border-b border-border last:border-b-0">
              <td className={usersTableBodyCellClass}>
                <span className="inline-block h-4 w-28 animate-pulse rounded-md bg-muted" />
              </td>
              <td className={usersTableBodyCellClass}>
                <span className="inline-block h-4 w-40 animate-pulse rounded-md bg-muted" />
              </td>
              <td className={usersTableBodyCellClass}>
                <span className="inline-block h-5 w-20 animate-pulse rounded-full bg-muted" />
              </td>
              <td className={usersTableBodyCellClass}>
                <span className="inline-block h-4 w-24 animate-pulse rounded-md bg-muted" />
              </td>
              <td className={usersTableBodyCellClass}>
                <span className="ml-auto block h-8 w-16 animate-pulse rounded-lg bg-muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <span className="sr-only">Loading skills follow-ups</span>
    </div>
  )
}
