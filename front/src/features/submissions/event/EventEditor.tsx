import { useEffect, useMemo, useRef, useState } from 'react'
import { Input, Textarea } from '@/components/ui'
import { useCategories } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import type {
  Contribution,
  EventContributionData,
  EventCostOption,
  EventRelationshipOption,
  SavedContributionPayload,
} from '@/types/submission'
import { EVENT_NAME_MAX_LENGTH } from '@/types/submission'
import {
  createEmptyEventData,
  isEventContributionData,
  normalizeEventContributionData,
} from './emptyState'
import { EventScheduleFields } from './EventScheduleFields'
import { RegistrationFields } from './RegistrationFields'
import { buildEventContributionSummary } from './summary'
import {
  EVENT_SECTIONS,
  getRevealedEventSections,
  isEventContributionComplete,
  validateEventContribution,
  validateSectionCategories,
  validateSectionLocation,
  validateSectionOverview,
  validateSectionRegistration,
  validateSectionRelationship,
  validateSectionSchedule,
  type EventFieldErrors,
} from './validation'
import { createEmptyLocation } from '../existingResource/emptyState'
import { EditorSection } from '../form/EditorSection'
import { Field } from '../form/Field'
import { LookupMultiSelect } from '../form/LookupMultiSelect'
import { OptionCardGroup } from '../form/OptionCardGroup'
import {
  AccessModeBothCallout,
  AccessModeSelector,
} from '../form/AccessModeSelector'
import { PhysicalLocationList } from '../form/PhysicalLocationList'
import type { PhysicalLocationGeocodingHandle } from '../form/PhysicalLocationList'

interface EventEditorProps {
  initialContribution: Contribution | null
  showErrors: boolean
  onShowErrorsChange: (show: boolean) => void
  onDirtyChange: (dirty: boolean) => void
  onRegisterSave: (save: () => SavedContributionPayload | null) => void
  onProgressChange?: (progress: {
    sections: readonly string[]
    revealed: number
    labelBreakpoint?: 'sm' | 'lg'
  } | null) => void
}

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

function initialDataFromContribution(
  contribution: Contribution | null,
): EventContributionData {
  if (contribution && isEventContributionData(contribution.data)) {
    return normalizeEventContributionData(
      JSON.parse(JSON.stringify(contribution.data)) as EventContributionData,
    )
  }
  return createEmptyEventData()
}

export function EventEditor({
  initialContribution,
  showErrors,
  onShowErrorsChange,
  onDirtyChange,
  onRegisterSave,
  onProgressChange,
}: EventEditorProps) {
  const { categories, isLoading: categoriesLoading, error: categoriesError, reload: reloadCategories } =
    useCategories()
  const { tags, isLoading: tagsLoading, error: tagsError } = useTags()

  const [data, setData] = useState<EventContributionData>(() =>
    initialDataFromContribution(initialContribution),
  )
  const [baseline] = useState(() =>
    JSON.stringify(initialDataFromContribution(initialContribution)),
  )
  const locationGeocodingRef = useRef<PhysicalLocationGeocodingHandle>(null)
  const [locationsVerified, setLocationsVerified] = useState(true)

  useEffect(() => {
    onDirtyChange(JSON.stringify(data) !== baseline)
  }, [data, baseline, onDirtyChange])

  const patch = (partial: Partial<EventContributionData>) => {
    setData((current) => ({ ...current, ...partial }))
  }

  const needsPhysical =
    data.accessMode === 'physical' || data.accessMode === 'both'

  useEffect(() => {
    if (!needsPhysical) setLocationsVerified(true)
  }, [needsPhysical])

  const syncRevealed = getRevealedEventSections(data)
  // Hold progressive unlock on Location until MapTiler verifies physical addresses.
  const revealed =
    needsPhysical && !locationsVerified
      ? Math.min(syncRevealed, 3)
      : syncRevealed

  useEffect(() => {
    onProgressChange?.({
      sections: EVENT_SECTIONS,
      revealed,
      labelBreakpoint: 'lg',
    })
  }, [revealed, onProgressChange])

  useEffect(() => {
    return () => onProgressChange?.(null)
  }, [onProgressChange])

  const errors: EventFieldErrors = showErrors
    ? validateEventContribution(data)
    : {}
  const overviewErrors = showErrors ? validateSectionOverview(data) : {}
  const scheduleErrors = showErrors ? validateSectionSchedule(data) : {}
  const locationErrors = showErrors ? validateSectionLocation(data) : {}
  const categoryErrors = showErrors ? validateSectionCategories(data) : {}
  const registrationErrors = showErrors
    ? validateSectionRegistration(data)
    : {}
  const relationshipErrors = showErrors
    ? validateSectionRelationship(data)
    : {}

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        id: c.category_id,
        name: c.name,
        description: c.description,
      })),
    [categories],
  )

  const filterOptions = useMemo(
    () => tags.map((t) => ({ id: t.tag_id, name: t.name })),
    [tags],
  )

  useEffect(() => {
    onRegisterSave(() => {
      onShowErrorsChange(true)
      if (!isEventContributionComplete(data)) return null
      const needsSites =
        data.accessMode === 'physical' || data.accessMode === 'both'
      if (needsSites && locationGeocodingRef.current) {
        if (!locationGeocodingRef.current.canProceed()) {
          void locationGeocodingRef.current.ensureValidated({
            focusOnFailure: true,
          })
          return null
        }
      }
      const meta = buildEventContributionSummary(data, categories, tags)
      return {
        title: meta.title,
        summary: meta.summary,
        highlights: meta.highlights,
        status: 'complete',
        data,
      }
    })
  }, [data, categories, tags, onRegisterSave, onShowErrorsChange])

  const needsOnline =
    data.accessMode === 'online' || data.accessMode === 'both'
  const needsCostDetails =
    data.costOption === 'other' ||
    data.costOption === 'paid' ||
    data.costOption === 'sliding_scale' ||
    data.costOption === 'donation' ||
    data.costOption === 'free_registration'

  return (
    <div className="space-y-5">
      <EditorSection
        id="event-overview"
        title="Tell us about the event"
        description="What is the event about, and who is it for? Include what will happen, who may benefit, and any important context."
      >
        <Field
          id="event-name"
          label="Event name"
          required
          error={overviewErrors.name}
        >
          <Input
            id="event-name"
            value={data.name}
            maxLength={EVENT_NAME_MAX_LENGTH}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g. Community tax clinic, Neighbourhood cleanup day, Beginner gardening workshop"
          />
        </Field>
        <Field
          id="event-description"
          label="Description"
          required
          error={overviewErrors.description}
        >
          <Textarea
            id="event-description"
            value={data.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Share what will happen, who may benefit, and anything people should know."
          />
        </Field>
      </EditorSection>

      {revealed >= 2 ? (
        <EditorSection
          id="event-schedule"
          title="When is the event happening?"
        >
          <EventScheduleFields
            data={data}
            onChange={patch}
            errors={scheduleErrors}
            showErrors={showErrors}
          />
        </EditorSection>
      ) : null}

      {revealed >= 3 ? (
        <EditorSection
          id="event-location"
          title="Location"
          description="Tell us how people can reach this event."
        >
          <AccessModeSelector
            name="event-access"
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
              Because you selected &ldquo;Both&rdquo;, please provide both
              location details and an online event link.
            </AccessModeBothCallout>
          ) : null}

          {needsPhysical && needsOnline ? (
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
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
              <Field
                id="event-online-url"
                label="Website or online link"
                required
                hint="Enter the website or online link where people can access this event."
                error={locationErrors.onlineUrl}
              >
                <Input
                  id="event-online-url"
                  type="url"
                  value={data.onlineUrl}
                  onChange={(e) => patch({ onlineUrl: e.target.value })}
                  placeholder="https://example.org/event"
                />
              </Field>
            </div>
          ) : (
            <>
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
              ) : null}

              {needsOnline ? (
                <Field
                  id="event-online-url"
                  label="Website or online link"
                  required
                  hint="Enter the website or online link where people can access this event."
                  error={locationErrors.onlineUrl}
                >
                  <Input
                    id="event-online-url"
                    type="url"
                    value={data.onlineUrl}
                    onChange={(e) => patch({ onlineUrl: e.target.value })}
                    placeholder="https://example.org/event"
                  />
                </Field>
              ) : null}
            </>
          )}
        </EditorSection>
      ) : null}

      {revealed >= 4 ? (
        <EditorSection
          id="event-categories"
          title="Help people discover it"
          description="Choose categories that best fit this event. Optional filters can make it easier to find."
        >
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
        </EditorSection>
      ) : null}

      {revealed >= 5 ? (
        <EditorSection
          id="event-registration"
          title="How can people attend or learn more?"
        >
          <RegistrationFields
            data={data}
            onChange={patch}
            errors={registrationErrors}
            showErrors={showErrors}
          />
        </EditorSection>
      ) : null}

      {revealed >= 6 ? (
        <EditorSection
          id="event-additional"
          title="Additional details"
          description="Everything here is optional unless a choice needs a short explanation."
        >
          <OptionCardGroup<EventCostOption>
            name="event-cost"
            legend="Is the event free?"
            options={COST_OPTIONS}
            value={data.costOption}
            onChange={(costOption) => patch({ costOption })}
          />
          {needsCostDetails ? (
            <Field
              id="event-cost-details"
              label="Cost details"
              required={data.costOption === 'other'}
              error={errors.costDetails}
            >
              <Input
                id="event-cost-details"
                value={data.costDetails}
                onChange={(e) => patch({ costDetails: e.target.value })}
                placeholder="e.g. $10 at the door, or by donation"
              />
            </Field>
          ) : null}

          <Field
            id="event-accessibility"
            label="Accessibility"
            hint="Is there anything people should know about accessibility? You can also use the filters above when relevant ones are available."
          >
            <Textarea
              id="event-accessibility"
              value={data.accessibilityNotes}
              onChange={(e) => patch({ accessibilityNotes: e.target.value })}
              placeholder="e.g. Wheelchair accessible venue, ASL interpretation available"
            />
          </Field>

          <Field id="event-eligibility" label="Who is the event for? (optional)">
            <Textarea
              id="event-eligibility"
              value={data.eligibility}
              onChange={(e) => patch({ eligibility: e.target.value })}
              placeholder="e.g. Open to Rideau-Rockcliffe residents and nearby neighbours"
            />
          </Field>

          <Field
            id="event-more-info"
            label="Where can people learn more? (optional)"
            error={errors.moreInfoUrl}
          >
            <Input
              id="event-more-info"
              value={data.moreInfoUrl}
              onChange={(e) => patch({ moreInfoUrl: e.target.value })}
              placeholder="https://"
            />
          </Field>

          <Field
            id="event-notes"
            label="Anything else we should know? (optional)"
          >
            <Textarea
              id="event-notes"
              value={data.generalNotes}
              onChange={(e) => patch({ generalNotes: e.target.value })}
            />
          </Field>
        </EditorSection>
      ) : null}

      {revealed >= 7 ? (
        <EditorSection
          id="event-connection"
          title="How are you connected to this event?"
          description="This helps our team understand your submission. It will not appear publicly on the map."
        >
          <OptionCardGroup<EventRelationshipOption>
            name="event-relationship"
            legend="Your connection to this event"
            options={RELATIONSHIP_OPTIONS}
            value={data.relationship}
            onChange={(relationship) => patch({ relationship })}
            error={relationshipErrors.relationship}
            layout="stack"
          />
          {data.relationship === 'other' ? (
            <Field
              id="event-relationship-other"
              label="Please explain"
              required
              error={relationshipErrors.relationshipOther}
            >
              <Input
                id="event-relationship-other"
                value={data.relationshipOther}
                onChange={(e) =>
                  patch({ relationshipOther: e.target.value })
                }
              />
            </Field>
          ) : null}
        </EditorSection>
      ) : null}
    </div>
  )
}
