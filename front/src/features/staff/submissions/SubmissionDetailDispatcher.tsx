import { ResourceDetailPresentation } from '@/features/discover/ResourceDetailScreen'
import { EventReviewPanel } from '@/features/staff/submissions/eventReview/EventReviewPanel'
import { NewResourceReviewPanel } from '@/features/staff/submissions/newResourceReview/NewResourceReviewPanel'
import { SkillReviewPanel } from '@/features/staff/submissions/skillReview/SkillReviewPanel'
import { ResourceUpdateReviewPanel } from '@/features/staff/submissions/updateReview/ResourceUpdateReviewPanel'
import type { SubmissionApprovalGate } from '@/features/staff/submissions/submissionApprovalGate'
import { resolveContributionPresentationKind } from '@/features/staff/submissions/mapEventVersionForPresentation'
import type {
  EventContributionData,
  ExistingResourceData,
  SkillsServicesData,
} from '@/types/submission'
import type { SubmissionDetailDto } from '@/types/moderationSubmission'

export type ModerationFinalVersion =
  | ExistingResourceData
  | EventContributionData
  | SkillsServicesData

interface SubmissionDetailDispatcherProps {
  submission: SubmissionDetailDto
  onApprovalGateChange?: (gate: SubmissionApprovalGate) => void
  onFinalVersionChange?: (data: ModerationFinalVersion | null) => void
}

/**
 * Chooses the editable moderation panel (or read-only fallback) for staff review.
 *
 * Resource Update → comparison panel
 * Event / Skill / New Resource → editable review panels
 */
export function SubmissionDetailDispatcher({
  submission,
  onApprovalGateChange,
  onFinalVersionChange,
}: SubmissionDetailDispatcherProps) {
  if (submission.submission_type === 'update_resource') {
    return (
      <ResourceUpdateReviewPanel
        submission={submission}
        onApprovalGateChange={onApprovalGateChange}
      />
    )
  }

  const version = submission.proposed_version
  if (!version) return null

  const kind = resolveContributionPresentationKind(
    version,
    submission.submission_type,
  )

  if (kind === 'event') {
    return (
      <EventReviewPanel
        submission={submission}
        onApprovalGateChange={onApprovalGateChange}
        onFinalVersionChange={onFinalVersionChange}
      />
    )
  }

  if (kind === 'skill') {
    return (
      <SkillReviewPanel
        submission={submission}
        onApprovalGateChange={onApprovalGateChange}
        onFinalVersionChange={onFinalVersionChange}
      />
    )
  }

  if (submission.submission_type === 'new_resource') {
    return (
      <NewResourceReviewPanel
        submission={submission}
        onApprovalGateChange={onApprovalGateChange}
        onFinalVersionChange={onFinalVersionChange}
      />
    )
  }

  return <ResourceDetailPresentation version={version} />
}
