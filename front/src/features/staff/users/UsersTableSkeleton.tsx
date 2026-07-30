import {
  usersTableBodyCellClass,
  usersTableHeaderCellClass,
} from '@/features/staff/users/usersTableStyles'

/**
 * Pulse skeleton rows matching UsersTable column layout.
 */
export function UsersTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className="overflow-x-auto scrollbar-thin"
      role="status"
      aria-label="Loading users"
    >
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th scope="col" className={usersTableHeaderCellClass}>
              User
            </th>
            <th scope="col" className={usersTableHeaderCellClass}>
              Email
            </th>
            <th scope="col" className={usersTableHeaderCellClass}>
              Role
            </th>
            <th scope="col" className={usersTableHeaderCellClass}>
              Status
            </th>
            <th scope="col" className={usersTableHeaderCellClass}>
              Created
            </th>
            <th scope="col" className={usersTableHeaderCellClass}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, index) => (
            <tr key={index} className="border-b border-border last:border-b-0">
              <td className={usersTableBodyCellClass}>
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                  <span className="h-4 w-28 animate-pulse rounded-md bg-muted" />
                </div>
              </td>
              <td className={usersTableBodyCellClass}>
                <span className="inline-block h-4 w-40 animate-pulse rounded-md bg-muted" />
              </td>
              <td className={usersTableBodyCellClass}>
                <span className="inline-block h-5 w-24 animate-pulse rounded-full bg-muted" />
              </td>
              <td className={usersTableBodyCellClass}>
                <span className="inline-block h-5 w-16 animate-pulse rounded-full bg-muted" />
              </td>
              <td className={usersTableBodyCellClass}>
                <span className="inline-block h-4 w-20 animate-pulse rounded-md bg-muted" />
              </td>
              <td className={usersTableBodyCellClass}>
                <span className="ml-auto block h-8 w-8 animate-pulse rounded-lg bg-muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <span className="sr-only">Loading users</span>
    </div>
  )
}
