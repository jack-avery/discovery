import { ResourceDetailPresentation } from '@/features/discover/ResourceDetailScreen'
import { EventDetailPresentation } from '@/features/staff/submissions/EventDetailPresentation'
import { SkillDetailPresentation } from '@/features/staff/submissions/SkillDetailPresentation'
import {
  ResourceUpdateReviewPanel,
  type ResourceUpdateApprovalGate,
} from '@/features/staff/submissions/updateReview/ResourceUpdateReviewPanel'
import {
  mapEventVersionForPresentation,
  resolveContributionPresentationKind,
} from '@/features/staff/submissions/mapEventVersionForPresentation'
import { mapSkillVersionForPresentation } from '@/features/staff/submissions/mapSkillVersionForPresentation'
import type { SubmissionDetailDto } from '@/types/moderationSubmission'
import { useMemo } from 'react'

interface SubmissionDetailDispatcherProps {
  submission: SubmissionDetailDto
  onUpdateApprovalGateChange?: (gate: ResourceUpdateApprovalGate) => void
}

/**
 * Chooses the correct proposed-content presentation for staff review.
 *
 * Resource Update → current vs proposed comparison with local acceptance
 * Existing Resource → ResourceDetailPresentation
 * Event → EventDetailPresentation
 * Skill / Service → SkillDetailPresentation
 */
export function SubmissionDetailDispatcher({
  submission,
  onUpdateApprovalGateChange,
}: SubmissionDetailDispatcherProps) {
  if (submission.submission_type === 'update_resource') {
    return (
      <ResourceUpdateReviewPanel
        submission={submission}
        onApprovalGateChange={onUpdateApprovalGateChange}
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
    return <EventSubmissionDetail version={version} />
  }

  if (kind === 'skill') {
    return <SkillSubmissionDetail submission={submission} />
  }

  return <ResourceDetailPresentation version={version} />
}

function EventSubmissionDetail({
  version,
}: {
  version: NonNullable<SubmissionDetailDto['proposed_version']>
}) {
  const presentation = useMemo(
    () => mapEventVersionForPresentation(version),
    [version],
  )
  return <EventDetailPresentation presentation={presentation} />
}

function SkillSubmissionDetail({
  submission,
}: {
  submission: SubmissionDetailDto
}) {
  const presentation = useMemo(
    () => mapSkillVersionForPresentation(submission),
    [submission],
  )
  if (!presentation) return null
  return <SkillDetailPresentation presentation={presentation} />
}
