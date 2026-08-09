import { useEffect, useMemo, useState } from 'react'
import { ResourceDetailHero } from '@/features/discover/resourceDetailSections'
import {
  isExistingResourceComplete,
  validateExistingResource,
} from '@/features/submissions/existingResource/validation'
import { ResourceUpdateComparisonView } from '@/features/submissions/updateRequest/ResourceUpdateComparisonView'
import { buildResourceUpdateComparison } from '@/features/submissions/updateRequest/buildResourceUpdateComparison'
import { mapResourceVersionToExistingResourceData } from '@/features/submissions/updateRequest/mapResourceVersionToExistingResourceData'
import {
  INCOMPLETE_EDITED_APPROVAL_HELPER,
  type SubmissionApprovalGate,
} from '@/features/staff/submissions/submissionApprovalGate'
import { useResourceUpdateAcceptance } from '@/features/staff/submissions/updateReview/useResourceUpdateAcceptance'
import { fieldErrorForUpdateComparisonField } from '@/features/staff/submissions/updateReview/updateReviewFieldErrors'
import { mergeLookupOptionsWithSelectedIds } from '@/features/staff/submissions/updateReview/mergeLookupOptionsWithSelectedIds'
import { renderUpdateReviewStructuredEditor } from '@/features/staff/submissions/updateReview/UpdateReviewStructuredEditors'
import { useCategories } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import type { ExistingResourceData } from '@/types/submission'
import type { SubmissionDetailDto } from '@/types/moderationSubmission'
import { cn } from '@/utils/cn'

export type ResourceUpdateApprovalGate = SubmissionApprovalGate

/**
 * Staff review for Resource Update submissions: stacked current → proposed
 * comparison with field acceptance and local final-version composition.
 */
export function ResourceUpdateReviewPanel({
  submission,
  onApprovalGateChange,
  onFinalVersionChange,
}: {
  submission: SubmissionDetailDto
  onApprovalGateChange?: (gate: ResourceUpdateApprovalGate) => void
  onFinalVersionChange?: (data: ExistingResourceData | null) => void
}) {
  const version = submission.proposed_version
  const baselineDto = submission.current_approved_resource ?? null
  const missingBaseline = baselineDto == null

  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    reload: reloadCategories,
  } = useCategories()
  const {
    tags,
    isLoading: tagsLoading,
    error: tagsError,
  } = useTags()
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

  const catalogCategoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        id: category.category_id,
        name: category.name,
        description: category.description,
      })),
    [categories],
  )

  const catalogFilterOptions = useMemo(
    () =>
      tags.map((tag) => ({
        id: tag.tag_id,
        name: tag.name,
      })),
    [tags],
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

  const differsFromProposed =
    acceptance.composedFinal?.differsFromProposed ??
    acceptance.hasOutcomeChanges

  const composedData = acceptance.composedFinal?.data ?? null

  // Shared public-form publishability check against the composed resource.
  const isComplete = useMemo(
    () =>
      composedData != null ? isExistingResourceComplete(composedData) : true,
    [composedData],
  )

  const showValidationErrors = differsFromProposed
  const validationErrors = useMemo(
    () =>
      showValidationErrors && composedData != null
        ? validateExistingResource(composedData)
        : {},
    [composedData, showValidationErrors],
  )

  // Lift composed final into the shared workspace path when outcome ≠ proposal.
  useEffect(() => {
    if (!onFinalVersionChange) return
    onFinalVersionChange(
      differsFromProposed && acceptance.composedFinal
        ? acceptance.composedFinal.data
        : null,
    )
  }, [
    acceptance.composedFinal,
    differsFromProposed,
    onFinalVersionChange,
  ])

  // Gate Approve when the composed (edited) resource would not be publishable.
  useEffect(() => {
    if (!onApprovalGateChange) return
    if (differsFromProposed && !isComplete) {
      onApprovalGateChange({
        approveDisabled: true,
        approveHelper: INCOMPLETE_EDITED_APPROVAL_HELPER,
      })
      return
    }
    onApprovalGateChange({ approveDisabled: false })
  }, [differsFromProposed, isComplete, onApprovalGateChange])

  // Clear gate / final version when leaving this panel / switching submissions.
  useEffect(() => {
    return () => {
      onApprovalGateChange?.({ approveDisabled: false })
      onFinalVersionChange?.(null)
    }
  }, [onApprovalGateChange, onFinalVersionChange, submission.submission_id])

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
          getFieldError: (fieldId) =>
            showValidationErrors
              ? fieldErrorForUpdateComparisonField(validationErrors, fieldId)
              : undefined,
          renderProposedControl: ({ field, disabled }) =>
            renderUpdateReviewStructuredEditor(field.id, disabled, {
              getContacts: acceptance.getContactsEditorValue,
              onContactsChange: acceptance.setContactsEdit,
              getAccessMode: acceptance.getAccessModeEditorValue,
              onAccessModeChange: acceptance.setAccessModeEdit,
              getLocations: acceptance.getLocationsEditorValue,
              onLocationsChange: acceptance.setLocationsEdit,
              getCategoryIds: acceptance.getCategoryIdsEditorValue,
              onCategoryIdsChange: acceptance.setCategoryIdsEdit,
              getFilterIds: acceptance.getFilterIdsEditorValue,
              onFilterIdsChange: acceptance.setFilterIdsEdit,
              getHours: acceptance.getHoursEditorValue,
              onHoursChange: acceptance.setHoursEdit,
              accessMode: acceptance.getAccessModeEditorValue(),
              categoryOptions: mergeLookupOptionsWithSelectedIds(
                catalogCategoryOptions,
                acceptance.getCategoryIdsEditorValue(),
                lookups.categoryNames,
              ),
              filterOptions: mergeLookupOptionsWithSelectedIds(
                catalogFilterOptions,
                acceptance.getFilterIdsEditorValue(),
                lookups.tagNames,
              ),
              categoriesLoading,
              categoriesError,
              onCategoriesRetry: reloadCategories,
              filtersLoading: tagsLoading,
              filtersError: tagsError,
              errors: validationErrors,
              showErrors: showValidationErrors,
            }),
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
        Proposed values are shown for review and can be edited locally.
        Field-by-field comparison will appear once the published baseline is
        available.
      </p>
    </div>
  )
}
