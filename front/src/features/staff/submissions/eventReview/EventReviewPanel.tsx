import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Input, Textarea } from '@/components/ui'
import { DetailSectionCard } from '@/features/discover/DetailInfoCard'
import { ResourceDetailHero } from '@/features/discover/resourceDetailSections'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'
import { EventScheduleFields } from '@/features/submissions/event/EventScheduleFields'
import { RegistrationFields } from '@/features/submissions/event/RegistrationFields'
import {
  createEmptyEventData,
  normalizeEventContributionData,
} from '@/features/submissions/event/emptyState'
import {
  isEventContributionComplete,
  validateEventContribution,
  validateSectionAdditional,
  validateSectionCategories,
  validateSectionLocation,
  validateSectionOverview,
  validateSectionRegistration,
  validateSectionRelationship,
  validateSectionSchedule,
} from '@/features/submissions/event/validation'
import { createEmptyLocation } from '@/features/submissions/existingResource/emptyState'
import { Field } from '@/features/submissions/form/Field'
import { LookupMultiSelect } from '@/features/submissions/form/LookupMultiSelect'
import { OptionCardGroup } from '@/features/submissions/form/OptionCardGroup'
import {
  AccessModeBothCallout,
  AccessModeSelector,
} from '@/features/submissions/form/AccessModeSelector'
import { PhysicalLocationList } from '@/features/submissions/form/PhysicalLocationList'
import type { PhysicalLocationGeocodingHandle } from '@/features/submissions/form/PhysicalLocationList'
import { resolveStaffLocationApprovalGate } from '@/features/staff/submissions/physicalLocationApproval'
import type { SubmissionApprovalGate } from '@/features/staff/submissions/submissionApprovalGate'
import { SectionEditChrome } from '@/features/staff/submissions/SectionEditChrome'
import {
  getEditedEventSections,
  hasEventReviewChanges,
  resetEventReviewSection,
  type EventReviewSectionId,
} from '@/features/staff/submissions/eventReview/eventReviewDiff'
import { mapEventVersionToEventContributionData } from '@/features/staff/submissions/eventReview/mapEventVersionToEventContributionData'
import { useCategories } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import type {
  EventContributionData,
  EventCostOption,
  EventRelationshipOption,
} from '@/types/submission'
import { EVENT_NAME_MAX_LENGTH } from '@/types/submission'
import type { SubmissionDetailDto } from '@/types/moderationSubmission'
import {
  CalendarDays,
  Info,
  MapPin,
  Settings,
  Tags,
  Ticket,
} from 'lucide-react'

const COST_OPTIONS: { value: EventCostOption; label: string }[] = [
  { value: 'free', label: 'Yes, free' },
  { value: 'free_registration', label: 'Free, but registration is required' },
  { value: 'paid', label: 'Paid' },
  { value: 'donation', label: 'Donation requested' },
  { value: 'sliding_scale', label: 'Sliding scale' },
  { value: 'not_sure', label: 'Not sure' },
  { value: 'other', label: 'Other' },
]

const RELATIONSHIP_OPTIONS: {
  value: EventRelationshipOption
  label: string
}[] = [
  { value: 'organizing', label: 'I am organizing or hosting it' },
  {
    value: 'represent_host',
    label: 'I represent the organization hosting it',
  },
  { value: 'volunteer', label: 'I volunteer with the organizers' },
  {
    value: 'public_info',
    label: 'I am sharing public information about it',
  },
  { value: 'someone_told_me', label: 'Someone told me about it' },
  { value: 'other', label: 'Other' },
]

/**
 * Editable event moderation view — EventDetailPresentation hierarchy + form controls.
 */
export function EventReviewPanel({
  submission,
  onApprovalGateChange,
  onFinalVersionChange,
}: {
  submission: SubmissionDetailDto
  onApprovalGateChange?: (gate: SubmissionApprovalGate) => void
  onFinalVersionChange?: (data: EventContributionData | null) => void
}) {
  const version = submission.proposed_version
  const { categories, isLoading: categoriesLoading, error: categoriesError, reload: reloadCategories } =
    useCategories()
  const { tags, isLoading: tagsLoading, error: tagsError } = useTags()
  const locationGeocodingRef = useRef<PhysicalLocationGeocodingHandle>(null)
  const [locationsVerified, setLocationsVerified] = useState(true)

  const baseline = useMemo(() => {
    if (!version) return createEmptyEventData()
    return mapEventVersionToEventContributionData(
      version,
      submission.submission_message,
    )
  }, [version, submission.submission_message])

  const [data, setData] = useState<EventContributionData>(() =>
    structuredClone(baseline),
  )

  useEffect(() => {
    setData(structuredClone(baseline))
  }, [baseline, submission.submission_id])

  const patch = useCallback((partial: Partial<EventContributionData>) => {
    setData((current) =>
      normalizeEventContributionData({ ...current, ...partial }),
    )
  }, [])

  const editedSections = useMemo(
    () => getEditedEventSections(baseline, data),
    [baseline, data],
  )
  const editedSet = useMemo(() => new Set(editedSections), [editedSections])
  const hasEdits = useMemo(
    () => hasEventReviewChanges(baseline, data),
    [baseline, data],
  )
  const isComplete = useMemo(() => isEventContributionComplete(data), [data])
  const needsPhysicalAccess =
    data.accessMode === 'physical' || data.accessMode === 'both'
  const showErrors = hasEdits || (needsPhysicalAccess && !locationsVerified)
  const errors = useMemo(
    () => (showErrors ? validateEventContribution(data) : {}),
    [data, showErrors],
  )
  const overviewErrors = showErrors ? validateSectionOverview(data) : {}
  const scheduleErrors = showErrors ? validateSectionSchedule(data) : {}
  const locationErrors = showErrors ? validateSectionLocation(data) : {}
  const categoryErrors = showErrors ? validateSectionCategories(data) : {}
  const registrationErrors = showErrors
    ? validateSectionRegistration(data)
    : {}
  const additionalErrors = showErrors ? validateSectionAdditional(data) : {}
  const relationshipErrors = showErrors
    ? validateSectionRelationship(data)
    : {}

  const resetSection = useCallback(
    (sectionId: EventReviewSectionId) => {
      setData((current) =>
        resetEventReviewSection(current, baseline, sectionId),
      )
    },
    [baseline],
  )

  useEffect(() => {
    if (!needsPhysicalAccess) setLocationsVerified(true)
  }, [needsPhysicalAccess])

  useEffect(() => {
    onFinalVersionChange?.(hasEdits ? data : null)
  }, [data, hasEdits, onFinalVersionChange])

  useEffect(() => {
    if (!onApprovalGateChange) return
    onApprovalGateChange(
      resolveStaffLocationApprovalGate({
        outcomeDiffersFromProposal: hasEdits,
        isComplete,
        accessMode: data.accessMode,
        locations: data.locations,
        locationsVerified,
      }),
    )
  }, [
    hasEdits,
    isComplete,
    data.accessMode,
    data.locations,
    locationsVerified,
    onApprovalGateChange,
  ])

  useEffect(() => {
    return () => {
      onApprovalGateChange?.({ approveDisabled: false })
      onFinalVersionChange?.(null)
    }
  }, [onApprovalGateChange, onFinalVersionChange, submission.submission_id])

  if (!version) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        This event submission has no proposed version to review.
      </p>
    )
  }

  const needsPhysical =
    data.accessMode === 'physical' || data.accessMode === 'both'
  const needsOnline =
    data.accessMode === 'online' || data.accessMode === 'both'
  const needsCostDetails =
    data.costOption === 'other' ||
    data.costOption === 'paid' ||
    data.costOption === 'sliding_scale' ||
    data.costOption === 'donation' ||
    data.costOption === 'free_registration'

  const categoryOptions = categories.map((category) => ({
    id: category.category_id,
    name: category.name,
    description: category.description,
  }))
  const filterOptions = tags.map((tag) => ({
    id: tag.tag_id,
    name: tag.name,
  }))

  return (
    <div className="flex flex-col gap-3">
      <ResourceDetailHero
        imageUrl={version.image_url}
        alt={`${data.name || version.name} photo`}
        fallbackAlt="Community event placeholder"
      />

      <WorkspaceSection aria-label="General information" divider className="pb-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Badge variant="primary">Event</Badge>
            <SectionEditChrome
              edited={editedSet.has('about')}
              onReset={() => resetSection('about')}
            />
          </div>
          <div className="space-y-4">
            <Field
              id="review-event-name"
              label="Event name"
              required
              error={overviewErrors.name ?? errors.name}
            >
              <Input
                id="review-event-name"
                value={data.name}
                maxLength={EVENT_NAME_MAX_LENGTH}
                onChange={(event) => patch({ name: event.target.value })}
              />
            </Field>
          </div>
        </div>
      </WorkspaceSection>

      <DetailSectionCard
        icon={<Info className="h-4 w-4" strokeWidth={2} />}
        title="About"
        headerAction={
          editedSet.has('about') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('about')}
            />
          ) : undefined
        }
      >
        <Field
          id="review-event-description"
          label="Description"
          required
          error={overviewErrors.description ?? errors.description}
        >
          <Textarea
            id="review-event-description"
            value={data.description}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </Field>
      </DetailSectionCard>

      <DetailSectionCard
        icon={<CalendarDays className="h-4 w-4" strokeWidth={2} />}
        title="Event Details"
        headerAction={
          editedSet.has('schedule') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('schedule')}
            />
          ) : undefined
        }
      >
        <EventScheduleFields
          data={data}
          onChange={patch}
          errors={scheduleErrors}
          showErrors={showErrors}
        />
      </DetailSectionCard>

      <DetailSectionCard
        icon={<MapPin className="h-4 w-4" strokeWidth={2} />}
        title="Location"
        headerAction={
          editedSet.has('location') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('location')}
            />
          ) : undefined
        }
      >
        <div className="space-y-4">
          <AccessModeSelector
            name="review-event-access"
            legend="How can people access this event?"
            value={data.accessMode}
            onChange={(accessMode) => {
              const needsSites =
                accessMode === 'physical' || accessMode === 'both'
              if (needsSites && data.locations.length === 0) {
                patch({ accessMode, locations: [createEmptyLocation()] })
              } else {
                patch({ accessMode })
              }
            }}
            error={locationErrors.accessMode}
          />
          {data.accessMode === 'both' ? (
            <AccessModeBothCallout>
              Because you selected “Both”, please provide both location details
              and an online event link.
            </AccessModeBothCallout>
          ) : null}
          {needsPhysical ? (
            <PhysicalLocationList
              ref={locationGeocodingRef}
              locations={data.locations}
              onChange={(locations) => patch({ locations })}
              showErrors={showErrors}
              locationFields={locationErrors.locationFields}
              listError={locationErrors.locations}
              requireAtLeastOne
              onVerifiedChange={setLocationsVerified}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No physical location required for online-only access.
            </p>
          )}
          {needsOnline ? (
            <Field
              id="review-event-online-url"
              label="Website or online link"
              required
              error={locationErrors.onlineUrl}
            >
              <Input
                id="review-event-online-url"
                type="url"
                value={data.onlineUrl}
                onChange={(event) => patch({ onlineUrl: event.target.value })}
                placeholder="https://example.org/event"
              />
            </Field>
          ) : null}
        </div>
      </DetailSectionCard>

      <DetailSectionCard
        icon={<Tags className="h-4 w-4" strokeWidth={2} />}
        title="Categories & filters"
        headerAction={
          editedSet.has('discover') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('discover')}
            />
          ) : undefined
        }
      >
        <div className="space-y-4">
          <LookupMultiSelect
            label="Categories"
            required
            options={categoryOptions}
            value={data.categoryIds}
            onChange={(categoryIds) => patch({ categoryIds })}
            isLoading={categoriesLoading}
            error={categoriesError}
            onRetry={reloadCategories}
            fieldError={categoryErrors.categories}
          />
          <LookupMultiSelect
            label="Filters"
            options={filterOptions}
            value={data.filterIds}
            onChange={(filterIds) => patch({ filterIds })}
            isLoading={tagsLoading}
            error={tagsError}
            emptyMessage="No filters are available yet."
          />
        </div>
      </DetailSectionCard>

      <DetailSectionCard
        icon={<Ticket className="h-4 w-4" strokeWidth={2} />}
        title="Registration & contact"
        headerAction={
          editedSet.has('attendance') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('attendance')}
            />
          ) : undefined
        }
      >
        <RegistrationFields
          data={data}
          onChange={patch}
          errors={{ ...errors, ...registrationErrors }}
          showErrors={showErrors}
        />
      </DetailSectionCard>

      <DetailSectionCard
        icon={<Settings className="h-4 w-4" strokeWidth={2} />}
        title="Service Details"
        headerAction={
          editedSet.has('details') ? (
            <SectionEditChrome
              edited
              onReset={() => resetSection('details')}
            />
          ) : undefined
        }
      >
        <div className="space-y-4">
          <OptionCardGroup<EventCostOption>
            name="review-event-cost"
            legend="What does it cost to attend?"
            options={COST_OPTIONS}
            value={data.costOption}
            onChange={(costOption) => patch({ costOption })}
          />
          {needsCostDetails ? (
            <Field
              id="review-event-cost-details"
              label="Cost details"
              required={data.costOption === 'other'}
              error={additionalErrors.costDetails}
            >
              <Input
                id="review-event-cost-details"
                value={data.costDetails}
                onChange={(event) => patch({ costDetails: event.target.value })}
              />
            </Field>
          ) : null}
          <Field id="review-event-accessibility" label="Accessibility">
            <Textarea
              id="review-event-accessibility"
              value={data.accessibilityNotes}
              onChange={(event) =>
                patch({ accessibilityNotes: event.target.value })
              }
            />
          </Field>
          <Field id="review-event-eligibility" label="Who can attend?">
            <Textarea
              id="review-event-eligibility"
              value={data.eligibility}
              onChange={(event) => patch({ eligibility: event.target.value })}
            />
          </Field>
          <Field
            id="review-event-more-info"
            label="Where can people learn more? (optional)"
            error={additionalErrors.moreInfoUrl}
          >
            <Input
              id="review-event-more-info"
              value={data.moreInfoUrl}
              onChange={(event) => patch({ moreInfoUrl: event.target.value })}
              placeholder="https://"
            />
          </Field>
          <Field id="review-event-notes" label="Additional event details">
            <Textarea
              id="review-event-notes"
              value={data.generalNotes}
              onChange={(event) => patch({ generalNotes: event.target.value })}
            />
          </Field>
          <OptionCardGroup<EventRelationshipOption>
            name="review-event-relationship"
            legend="Connection to this event"
            options={RELATIONSHIP_OPTIONS}
            value={data.relationship}
            onChange={(relationship) => patch({ relationship })}
            error={relationshipErrors.relationship}
            layout="stack"
          />
          {data.relationship === 'other' ? (
            <Field
              id="review-event-relationship-other"
              label="Please describe the connection"
              error={relationshipErrors.relationshipOther}
            >
              <Input
                id="review-event-relationship-other"
                value={data.relationshipOther}
                onChange={(event) =>
                  patch({ relationshipOther: event.target.value })
                }
              />
            </Field>
          ) : null}
        </div>
      </DetailSectionCard>

      <WorkspaceSection aria-label="Disclaimer">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Information may change over time. Please contact the organizers
          directly to confirm details before attending.
        </p>
      </WorkspaceSection>
    </div>
  )
}
