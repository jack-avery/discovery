import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import type { PlaceholderSubmissionRow } from '@/features/staff/dashboard/placeholderData'
import { cn } from '@/utils/cn'

interface DashboardRecentSubmissionsProps {
  submissions: PlaceholderSubmissionRow[]
}

export function DashboardRecentSubmissions({
  submissions,
}: DashboardRecentSubmissionsProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Recent Submissions
        </h3>
        <Link
          to="/staff/submissions"
          className="shrink-0 text-sm font-medium text-interactive hover:text-interactive-hover focus-ring rounded-sm"
        >
          View all submissions →
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y divide-border-subtle">
          {submissions.map((submission) => {
            const Icon = submission.icon
            return (
              <li
                key={submission.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-semibold text-foreground">
                    {submission.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Submitted by {submission.submitter}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <Badge variant={submission.badgeVariant}>
                    {submission.badgeLabel}
                  </Badge>
                  <span
                    className={cn(
                      'whitespace-nowrap text-xs text-muted-foreground',
                    )}
                  >
                    {submission.relativeTime}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
