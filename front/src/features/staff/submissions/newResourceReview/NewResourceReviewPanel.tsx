import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Phone } from 'lucide-react'
import { Badge } from '@/components/ui'
import { DetailSectionCard } from '@/features/discover/DetailInfoCard'
import {
  ResourceDetailAboutShell,
  ResourceDetailHero,
  ResourceDetailLocationShell,
  ResourceDetailServiceDetailsShell,
} from '@/features/discover/resourceDetailSections'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'
import {
  createEmptyExistingResourceData,
  normalizeExistingResourceData,
} from '@/features/submissions/existingResource/emptyState'
import {
  isExistingResourceComplete,
  validateExistingResource,
} from '@/features/submissions/existingResource/validation'
import { mapResourceVersionToExistingResourceData } from '@/features/submissions/updateRequest/mapResourceVersionToExistingResourceData'
import type { PhysicalLocationGeocodingHandle } from '@/features/submissions/form/PhysicalLocationList'
import {
  EDITED_APPROVAL_BLOCKED_HELPER,
  type SubmissionApprovalGate,
} from '@/features/staff/submissions/submissionApprovalGate'
import {
  getEditedNewResourceSections,
  hasNewResourceReviewChanges,
  resetNewResourceReviewSection,
  type NewResourceReviewSectionId,
} from '@/features/staff/submissions/newResourceReview/newResourceReviewDiff'
import {
  NewResourceAboutFields,
  NewResourceContactFields,
  NewResourceIdentityFields,
  NewResourceLocationFields,
  NewResourceServiceFields,
} from '@/features/staff/submissions/newResourceReview/NewResourceReviewFields'
import { SectionEditChrome } from '@/features/staff/submissions/SectionEditChrome'
import { useCategories } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import type { ExistingResourceData } from '@/types/submission'
import type { SubmissionDetailDto } from '@/types/moderationSubmission'

export type { SubmissionApprovalGate }

/**
 * Editable new-resource moderation view.
 * Matches resource-detail section hierarchy; keeps a local finalized version
 * for upcoming approved_version integration (not sent yet).
 */
export function NewResourceReviewPanel({
  submission,
  onApprovalGateChange,
  onFinalVersionChange,
}: {
  submission: SubmissionDetailDto
  onApprovalGateChange?: (gate: SubmissionApprovalGate) => void
  /** Local composed final version for future approved_version payload. */
  onFinalVersionChange?: (data: ExistingResourceData | null) => void
}) {
  const version = submission.proposed_version
  const { categories, isLoading: categoriesLoading, error: categoriesError, reload: reloadCategories } =
    useCategories()
  const { tags, isLoading: tagsLoading, error: tagsError } = useTags()
  const locationGeocodingRef = useRef<PhysicalLocationGeocodingHandle>(null)
  const [, setLocationsVerified] = useState(true)

  const baseline = useMemo(() => {
    if (!version) return createEmptyExistingResourceData()
    return mapResourceVersionToExistingResourceData(version)
  }, [version])

  const [data, setData] = useState<ExistingResourceData>(() =>
    structuredClone(baseline),
  )

  // Reset editable state when the selected submission changes.
  useEffect(() => {
    setData(structuredClone(baseline))
  }, [baseline, submission.submission_id])

  const patch = useCallback((partial: Partial<ExistingResourceData>) => {
    setData((current) =>
      normalizeExistingResourceData({ ...current, ...partial }),
    )
  }, [])

  const editedSections = useMemo(
    () => getEditedNewResourceSections(baseline, data),
    [baseline, data],
  )
  const editedSet = useMemo(() => new Set(editedSections), [editedSections])
  const hasEdits = useMemo(
    () => hasNewResourceReviewChanges(baseline, data),
    [baseline, data],
  )
  const isComplete = useMemo(() => isExistingResourceComplete(data), [data])
  const showErrors = hasEdits
  const errors = useMemo(
    () => (showErrors ? validateExistingResource(data) : {}),
    [data, showErrors],
  )

  const resetSection = useCallback(
    (sectionId: NewResourceReviewSectionId) => {
      setData((current) =>
        resetNewResourceReviewSection(current, baseline, sectionId),
      )
    },
    [baseline],
  )

  useEffect(() => {
    onFinalVersionChange?.(hasEdits ? data : null)
  }, [data, hasEdits, onFinalVersionChange])

  useEffect(() => {
    if (!onApprovalGateChange) return
    if (hasEdits) {
      onApprovalGateChange({
        approveDisabled: true,
        approveHelper: isComplete
          ? EDITED_APPROVAL_BLOCKED_HELPER
          : `${EDITED_APPROVAL_BLOCKED_HELPER} Fix validation errors in the highlighted fields before a future edited approval can be submitted.`,
      })
      return
    }
    onApprovalGateChange({ approveDisabled: false })
  }, [hasEdits, isComplete, onApprovalGateChange])

  useEffect(() => {
    return () => {
      onApprovalGateChange?.({ approveDisabled: false })
      onFinalVersionChange?.(null)
    }
  }, [onApprovalGateChange, onFinalVersionChange, submission.submission_id])

  if (!version) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        This submission has no proposed version to review.
      </p>
    )
  }

  const locationTitle =
    data.accessMode === 'online'
      ? 'Location'
      : data.locations.filter(
          (location) =>
            location.streetAddress.trim() || location.locationName.trim(),
        ).length > 1
        ? 'Locations'
        : 'Location'

  return (
    <div className="flex flex-col gap-3">
      <ResourceDetailHero
        imageUrl={version.image_url}
        alt={`${data.name || version.name} photo`}
      />

      <WorkspaceSection
        aria-label="General information"
        divider
        className="pb-3"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            {version.resource_type?.trim() ? (
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant="primary">{version.resource_type}</Badge>
              </div>
            ) : (
              <span />
            )}
            <SectionEditChrome
              edited={editedSet.has('identity')}
              onReset={() => resetSection('identity')}
            />
          </div>
          <NewResourceIdentityFields
            data={data}
            patch={patch}
            errors={errors}
            showErrors={showErrors}
            categories={categories}
            tags={tags}
            categoriesLoading={categoriesLoading}
            tagsLoading={tagsLoading}
            categoriesError={categoriesError}
            tagsError={tagsError}
            onCategoriesRetry={reloadCategories}
          />
        </div>
      </WorkspaceSection>

      <ResourceDetailAboutShell
        headerAction={
          editedSet.has('about') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('about')}
            />
          ) : undefined
        }
      >
        <NewResourceAboutFields
          data={data}
          patch={patch}
          errors={errors}
          showErrors={showErrors}
        />
      </ResourceDetailAboutShell>

      <DetailSectionCard
        icon={<Phone className="h-4 w-4" strokeWidth={2} />}
        title="Contact"
        headerAction={
          editedSet.has('contact') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('contact')}
            />
          ) : undefined
        }
      >
        <NewResourceContactFields
          data={data}
          patch={patch}
          errors={errors}
          showErrors={showErrors}
        />
      </DetailSectionCard>

      <ResourceDetailLocationShell
        title={locationTitle}
        headerAction={
          editedSet.has('location') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('location')}
            />
          ) : undefined
        }
      >
        <NewResourceLocationFields
          data={data}
          patch={patch}
          errors={errors}
          showErrors={showErrors}
          locationGeocodingRef={locationGeocodingRef}
          onVerifiedChange={setLocationsVerified}
        />
      </ResourceDetailLocationShell>

      <ResourceDetailServiceDetailsShell
        headerAction={
          editedSet.has('service') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('service')}
            />
          ) : undefined
        }
      >
        <NewResourceServiceFields
          data={data}
          patch={patch}
          errors={errors}
          showErrors={showErrors}
        />
      </ResourceDetailServiceDetailsShell>

      <WorkspaceSection aria-label="Disclaimer">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Information may change over time. Please contact the organization
          directly to confirm hours, availability, and eligibility before
          visiting.
        </p>
      </WorkspaceSection>
    </div>
  )
}
