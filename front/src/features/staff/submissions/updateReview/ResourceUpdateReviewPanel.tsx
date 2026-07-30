import { useEffect, useMemo, useState } from 'react'
import { ResourceDetailHero } from '@/features/discover/resourceDetailSections'
import { ResourceUpdateComparisonView } from '@/features/submissions/updateRequest/ResourceUpdateComparisonView'
import { buildResourceUpdateComparison } from '@/features/submissions/updateRequest/buildResourceUpdateComparison'
import { mapResourceVersionToExistingResourceData } from '@/features/submissions/updateRequest/mapResourceVersionToExistingResourceData'
import {
  EDITED_APPROVAL_BLOCKED_HELPER,
  type SubmissionApprovalGate,
} from '@/features/staff/submissions/submissionApprovalGate'
import { useResourceUpdateAcceptance } from '@/features/staff/submissions/updateReview/useResourceUpdateAcceptance'
import { useCategories } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import type { SubmissionDetailDto } from '@/types/moderationSubmission'
import { cn } from '@/utils/cn'

export type ResourceUpdateApprovalGate = SubmissionApprovalGate

const APPROVAL_BLOCKED_HELPER = EDITED_APPROVAL_BLOCKED_HELPER

/**
 * Staff review for Resource Update submissions: stacked current → proposed
 * comparison with field acceptance and local final-version composition.
 */
export function ResourceUpdateReviewPanel({
  submission,
  onApprovalGateChange,
}: {
  submission: SubmissionDetailDto
  onApprovalGateChange?: (gate: ResourceUpdateApprovalGate) => void
}) {
  const version = submission.proposed_version
  const baselineDto = submission.current_approved_resource ?? null
  const missingBaseline = baselineDto == null

  const { categories } = useCategories()
  const { tags } = useTags()
  const [showUnchanged, setShowUnchanged] = useState(false)

  const proposed = useMemo(
    () => (version ? mapResourceVersionToExistingResourceData(version) : null),
    [version],
  )

  const baseline = useMemo(
    () =>
      baselineDto?.version
        ? mapResourceVersionToExistingResourceData(baselineDto.version)
        : null,
    [baselineDto],
  )

  const lookups = useMemo(
    () => ({
      categoryNames: Object.fromEntries(
        categories.map((category) => [category.category_id, category.name]),
      ),
      tagNames: Object.fromEntries(
        tags.map((tag) => [tag.tag_id, tag.name]),
      ),
    }),
    [categories, tags],
  )

  const comparison = useMemo(() => {
    if (!proposed) return null
    return buildResourceUpdateComparison(baseline, proposed, lookups)
  }, [baseline, lookups, proposed])

  const acceptance = useResourceUpdateAcceptance(
    comparison,
    submission.submission_id,
    baseline,
    proposed,
  )

  // Keep approval gate in sync with local outcome changes.
  useEffect(() => {
    if (!onApprovalGateChange) return
    const blocksApproval =
      acceptance.composedFinal?.differsFromProposed ??
      acceptance.hasOutcomeChanges
    if (blocksApproval) {
      onApprovalGateChange({
        approveDisabled: true,
        approveHelper: APPROVAL_BLOCKED_HELPER,
      })
      return
    }
    onApprovalGateChange({ approveDisabled: false })
  }, [
    acceptance.composedFinal?.differsFromProposed,
    acceptance.hasOutcomeChanges,
    onApprovalGateChange,
  ])

  // Clear gate when leaving this panel / switching submissions.
  useEffect(() => {
    return () => {
      onApprovalGateChange?.({ approveDisabled: false })
    }
  }, [onApprovalGateChange, submission.submission_id])

  if (!version || !proposed || !comparison) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        This Resource Update has no proposed version to review.
      </p>
    )
  }

  const approvedVersion = baselineDto?.version ?? null
  const heroImageUrl = approvedVersion?.image_url ?? null
  const heroAltName =
    approvedVersion?.name?.trim() ||
    version.name?.trim() ||
    'Resource'

  return (
    <div className="space-y-4">
      <ResourceDetailHero
        imageUrl={heroImageUrl}
        alt={`${heroAltName} photo`}
      />

      {missingBaseline ? <MissingBaselineWarning /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">
            Change review
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {comparison.hasBaseline
              ? comparison.changeCount === 0
                ? 'No field differences from the published resource.'
                : `${comparison.changeCount} changed ${
                    comparison.changeCount === 1 ? 'field' : 'fields'
                  } shown by default.`
              : 'Proposed values are shown below. Current published values could not be loaded.'}
          </p>
        </div>
        {comparison.hasBaseline ? (
          <label
            className={cn(
              'inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground',
            )}
          >
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(event) => setShowUnchanged(event.target.checked)}
              className="rounded border-border"
            />
            <span>Show unchanged information</span>
          </label>
        ) : null}
      </div>

      <ResourceUpdateComparisonView
        comparison={comparison}
        showUnchanged={showUnchanged}
        emptyMessage={
          comparison.hasBaseline
            ? showUnchanged
              ? 'No fields to review.'
              : 'No changed fields. Turn on “Show unchanged information” to review matching fields.'
            : 'No proposed field values to review.'
        }
        review={{
          accepted: acceptance.accepted,
          onAcceptedChange: acceptance.setFieldAccepted,
          getProposedValue: acceptance.getProposedValue,
          onProposedChange: acceptance.setFieldEdit,
          isFieldEdited: acceptance.isFieldEdited,
          onResetField: acceptance.resetFieldEdit,
        }}
      />
    </div>
  )
}

/** Kept for workspace typing / selective-approval summaries. */
export interface ResourceUpdateReviewModerationState {
  active: true
  allSelected: boolean
  selectedCount: number
  totalCount: number
}

function MissingBaselineWarning() {
  return (
    <div
      role="status"
      className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3"
    >
      <p className="text-sm font-medium text-foreground">
        Current published version could not be loaded
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Proposed values are shown for review and can be edited locally. Approval
        stays available only while you leave the proposal unchanged. Field-by-field
        comparison will appear once the published baseline is available.
      </p>
    </div>
  )
}
