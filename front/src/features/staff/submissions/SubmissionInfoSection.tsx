import type { ReactNode } from 'react'
import { DetailSectionCard } from '@/features/discover/DetailInfoCard'
import {
  contributionKindLabel,
  type ReviewContributionKind,
} from '@/features/staff/submissions/fetchReviewQueue'
import {
  formatSubmissionDate,
  submissionTypeLabel,
} from '@/services/staffSubmissionService'
import type { SubmissionDetailDto } from '@/types/moderationSubmission'
import { ClipboardList } from 'lucide-react'

interface SubmissionInfoSectionProps {
  submission: SubmissionDetailDto
  /** When set (from the queue), preferred over raw submission_type for labels. */
  contributionKind?: ReviewContributionKind
}

/**
 * Moderator metadata shown above the resident resource presentation.
 */
export function SubmissionInfoSection({
  submission,
  contributionKind,
}: SubmissionInfoSectionProps) {
  const typeLabel = contributionKind
    ? contributionKindLabel(contributionKind)
    : submissionTypeLabel(submission.submission_type)

  return (
    <DetailSectionCard
      icon={<ClipboardList className="h-4 w-4" strokeWidth={2} />}
      title="Submission Information"
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <InfoItem label="Submitter name">
          {submission.submitter_name?.trim() || 'Not provided'}
        </InfoItem>
        <InfoItem label="Submitter email">
          {submission.submitter_email?.trim() || 'Not provided'}
        </InfoItem>
        <InfoItem label="Submitted">
          {formatSubmissionDate(submission.created_at, { includeTime: true })}
        </InfoItem>
        <InfoItem label="Submission type">{typeLabel}</InfoItem>
        {submission.submission_message?.trim() ? (
          <InfoItem label="Message" className="sm:col-span-2">
            <p className="whitespace-pre-wrap">{submission.submission_message}</p>
          </InfoItem>
        ) : null}
      </dl>
    </DetailSectionCard>
  )
}

function InfoItem({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  )
}
