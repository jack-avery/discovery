import { ResourceDetailPresentation } from '@/features/discover/ResourceDetailScreen'
import type { ExistingResourceData } from '@/types/submission'
import type { SubmissionDetailDto } from '@/types/moderationSubmission'

/**
 * Staff review for Resource Update submissions (temporary proposed-only mode).
 *
 * Until the live approved resource can be loaded, we must not imply field-level
 * diffs. Keep toggles / change counts / selective approve stay in the codebase
 * ({@link useResourceUpdateAcceptance}, {@link buildResourceUpdateComparison})
 * and will be re-enabled once baseline is available.
 *
 * TODO:
 * When the moderation API exposes submission.resource_id,
 * load the approved resource,
 * map it to ExistingResourceData,
 * and pass it as the baseline to buildResourceUpdateComparison().
 *
 * Then restore the Change Review UI (Keep toggles, selection counts,
 * Current → Proposed) using that comparison — no redesign required.
 *
 * @param baseline Reserved for the future Change Review path; unused while
 *   resource_id is unavailable.
 */
export function ResourceUpdateReviewPanel({
  submission,
  baseline: _baseline = null,
}: {
  submission: SubmissionDetailDto
  /** Reserved for future Change Review once resource_id is available. */
  baseline?: ExistingResourceData | null
}) {
  void _baseline

  const version = submission.proposed_version
  if (!version) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        This update request has no proposed version to review.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <CurrentValuesCallout />
      <ResourceDetailPresentation version={version} />
    </div>
  )
}

/** Kept for workspace typing until Change Review is re-enabled. */
export interface ResourceUpdateReviewModerationState {
  active: true
  allSelected: boolean
  selectedCount: number
  totalCount: number
}

function CurrentValuesCallout() {
  return (
    <div
      role="status"
      className="rounded-xl border border-border-subtle bg-muted/40 px-4 py-3"
    >
      <p className="text-sm font-medium text-foreground">
        Current values coming soon
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Current values will be shown here to help moderators compare existing
        information with the proposed changes.
      </p>
    </div>
  )
}
