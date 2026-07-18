import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import {
  contributionKindLabel,
  type ReviewQueueItem,
} from '@/features/staff/submissions/fetchReviewQueue'
import { formatSubmissionDate } from '@/services/staffSubmissionService'

interface SubmissionQueueListProps {
  items: ReviewQueueItem[]
  selectedId: number | null
  onSelect: (submissionId: number) => void
}

export function SubmissionQueueList({
  items,
  selectedId,
  onSelect,
}: SubmissionQueueListProps) {
  return (
    <ul className="space-y-1 p-0 list-none" role="listbox" aria-label="Submission queue">
      {items.map((item) => {
        const selected = item.submission_id === selectedId
        return (
          <li key={item.submission_id}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(item.submission_id)}
              className={cn(
                'w-full rounded-xl border px-3 py-3 text-left transition-colors focus-ring',
                selected
                  ? 'border-interactive bg-interactive-muted'
                  : 'border-border bg-surface hover:bg-muted',
              )}
            >
              <p className="min-w-0 font-heading text-sm font-semibold leading-snug text-foreground">
                {item.proposed_resource_name?.trim() || 'Untitled submission'}
              </p>
              <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                <QueueMetaRow label="Type">
                  {contributionKindLabel(item.contributionKind)}
                </QueueMetaRow>
                <QueueMetaRow label="Submitted by">
                  {item.submitter_name?.trim() || 'Anonymous'}
                </QueueMetaRow>
                <QueueMetaRow label="Submitted">
                  {formatSubmissionDate(item.created_at)}
                </QueueMetaRow>
              </dl>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function QueueMetaRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-medium text-foreground/70">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  )
}
