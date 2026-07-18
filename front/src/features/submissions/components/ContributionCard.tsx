import { Pencil, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import type { Contribution } from '@/types/submission'
import { CONTRIBUTION_TYPE_META } from '../constants/contributionTypes'

interface ContributionCardProps {
  contribution: Contribution
  onEdit: () => void
  onDelete: () => void
  /** When true, edit/delete are disabled (e.g. while submitting). */
  actionsDisabled?: boolean
}

/**
 * Saved contribution summary card.
 * Editors open in ContributionEditorSheet — this card does not expand inline.
 */
export function ContributionCard({
  contribution,
  onEdit,
  onDelete,
  actionsDisabled = false,
}: ContributionCardProps) {
  const meta = CONTRIBUTION_TYPE_META[contribution.type]
  const Icon = meta.icon
  const isComplete = contribution.status === 'complete'

  return (
    <Card data-contribution-card={contribution.id} id={`contribution-card-${contribution.id}`}>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-primary"
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                id={`contribution-card-title-${contribution.id}`}
                tabIndex={-1}
                className="font-heading text-base font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
              >
                {contribution.title}
              </h3>
              <Badge variant={isComplete ? 'success' : 'pending'}>
                {isComplete ? 'Complete' : 'Incomplete'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{meta.label}</p>
            {contribution.highlights.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {contribution.highlights.map((item) => (
                  <li key={item}>
                    <Badge variant="outline">{item}</Badge>
                  </li>
                ))}
              </ul>
            ) : contribution.summary ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {contribution.summary}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onEdit}
            disabled={actionsDisabled}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={actionsDisabled}
            aria-label={`Delete ${contribution.title}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
