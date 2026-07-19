import { Pencil, UserRound } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import type { ContributorInfo } from '@/types/submission'
import { preferredContactLabel } from './emptyState'
import { isContributorComplete } from './validation'

interface ContributorSummaryCardProps {
  contributor: ContributorInfo
  onEdit: () => void
  requireResourceConnection?: boolean
}

export function ContributorSummaryCard({
  contributor,
  onEdit,
  requireResourceConnection = false,
}: ContributorSummaryCardProps) {
  const complete = isContributorComplete(contributor, {
    requireResourceConnection,
  })

  return (
    <Card id="contributor-summary-card">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
          aria-label="Edit your information"
        >
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-primary"
            aria-hidden="true"
          >
            <UserRound className="h-5 w-5" strokeWidth={1.75} />
          </span>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                id="contributor-summary-title"
                tabIndex={-1}
                className="font-heading text-base font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
              >
                Your Information
              </h3>
              <Badge variant={complete ? 'success' : 'pending'}>
                {complete ? 'Complete' : 'Incomplete'}
              </Badge>
            </div>
            <p className="text-sm font-medium text-foreground">
              {contributor.name.trim() || 'Name not added yet'}
            </p>
            <ul className="space-y-0.5 text-sm text-muted-foreground">
              <li>{contributor.email.trim() || 'Email not added yet'}</li>
              {contributor.phone.trim() ? (
                <li>{contributor.phone.trim()}</li>
              ) : null}
              <li>
                Preferred contact:{' '}
                {preferredContactLabel(contributor.preferredContactMethod)}
              </li>
            </ul>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
