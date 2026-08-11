import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Input, Textarea } from '@/components/ui'
import { useCategories } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import type {
  Contribution,
  CostOption,
  ExistingResourceData,
  HoursAvailability,
  SavedContributionPayload,
} from '@/types/submission'
import { RESOURCE_NAME_MAX_LENGTH } from '@/types/submission'
import {
  createEmptyExistingResourceData,
  createEmptyLocation,
  isExistingResourceData,
  normalizeExistingResourceData,
} from './emptyState'
import { buildExistingResourceSummary } from './summary'
import {
  EXISTING_RESOURCE_SECTIONS,
  getRevealedSections,
  isExistingResourceComplete,
  validateExistingResource,
  validateSectionAbout,
  validateSectionAccess,
  validateSectionCategories,
  validateSectionContacts,
  type FieldErrors,
} from './validation'
import { ContactMethodList } from '../form/ContactMethodList'
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
import { WeeklyHoursEditor } from '../form/WeeklyHoursEditor'
import {
  getEditedUpdateSections,
  getFirstInvalidUpdateSection,
  hasResourceDataChanges,
} from '../updateRequest/updateSectionDiff'
import {
  UPDATE_SECTION_OPTIONS,
  type UpdateSectionId,
} from '../updateRequest/updateSections'

export type ExistingResourceEditorMode = 'create' | 'update'

interface ExistingResourceEditorProps {
  /** Existing contribution when editing; null when creating. */
  initialContribution: Contribution | null
  /** Prefill for update mode (preferred over contribution when set). */
  initialData?: ExistingResourceData
  mode?: ExistingResourceEditorMode
  /**
   * Update mode: immutable original resource values for change detection.
   * Pass the live-resource prefill so hasChanges compares against the listing,
   * not a later edited draft snapshot.
   */
  updateBaseline?: ExistingResourceData
  /** Update mode: sections that start expanded. */
  initialExpandedSections?: UpdateSectionId[]
  showErrors: boolean
  onShowErrorsChange: (show: boolean) => void
  onDirtyChange: (dirty: boolean) => void
  onRegisterSave: (save: () => SavedContributionPayload | null) => void
  onProgressChange?: (progress: {
    sections: readonly string[]
    revealed: number
  } | null) => void
  /** Update mode: live change / validity reporting for the parent workspace. */
  onUpdateStateChange?: (state: {
    data: ExistingResourceData
    hasChanges: boolean
    editedSections: UpdateSectionId[]
    isComplete: boolean
  }) => void
}

const COST_OPTIONS: { value: CostOption; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'sliding_scale', label: 'Sliding scale' },
  { value: 'donation', label: 'Donation requested' },
  { value: 'not_sure', label: 'Not sure' },
  { value: 'other', label: 'Other' },
]

const HOURS_MODE_OPTIONS: { value: HoursAvailability; label: string }[] = [
  { value: 'structured', label: 'Set weekly hours' },
  { value: 'varies', label: 'Hours vary' },
  { value: 'contact_for_hours', label: 'Contact the resource for hours' },
]

function resolveInitialData(
  initialData: ExistingResourceData | undefined,
  contribution: Contribution | null,
): ExistingResourceData {
  if (initialData) {
    return normalizeExistingResourceData(
      JSON.parse(JSON.stringify(initialData)) as ExistingResourceData,
    )
  }
  if (contribution && isExistingResourceData(contribution.data)) {
    return normalizeExistingResourceData(
      JSON.parse(JSON.stringify(contribution.data)) as ExistingResourceData,
    )
  }
  return createEmptyExistingResourceData()
}

/**
 * Public New Resource / Update Resource contribution editor.
 *
 * TODO(images): Implement public resource image upload once the backend exposes
 * a public-safe upload contract. Current POST /uploads/resources is moderator+
 * only, while POST /submissions already accepts image_url. Intended flow:
 * select image -> preview -> upload -> receive image_url -> include in submission.
 * Ensure submitted images are visible in staff review and published Resource
 * Detail. Backend/deployment must also confirm /uploads serving through Caddy.
 */
export function ExistingResourceEditor({
  initialContribution,
  initialData,
  mode = 'create',
  updateBaseline,
  initialExpandedSections = [],
  showErrors,
  onShowErrorsChange,
  onDirtyChange,
  onRegisterSave,
  onProgressChange,
  onUpdateStateChange,
}: ExistingResourceEditorProps) {
  const isUpdate = mode === 'update'
  const { categories, isLoading: categoriesLoading, error: categoriesError, reload: reloadCategories } =
    useCategories()
  const { tags, isLoading: tagsLoading, error: tagsError } = useTags()

  const [data, setData] = useState<ExistingResourceData>(() =>
    resolveInitialData(initialData, initialContribution),
  )
  /** Snapshot at mount — dirty tracking for leave warnings. */
  const [mountSnapshot] = useState(() =>
    resolveInitialData(initialData, initialContribution),
  )
  /**
   * Original resource values for update change detection.
   * Falls back to mount snapshot when first opening from the picker.
   */
  const [changeBaseline] = useState(() =>
    updateBaseline
      ? normalizeExistingResourceData(
          JSON.parse(JSON.stringify(updateBaseline)) as ExistingResourceData,
        )
      : resolveInitialData(initialData, initialContribution),
  )
  const mountSnapshotJson = useMemo(
    () => JSON.stringify(mountSnapshot),
    [mountSnapshot],
  )

  const [expandedSections, setExpandedSections] = useState<
    Set<UpdateSectionId>
  >(() => new Set(initialExpandedSections))

  const locationGeocodingRef = useRef<PhysicalLocationGeocodingHandle>(null)
  const [locationsVerified, setLocationsVerified] = useState(true)
  const prevShowErrorsRef = useRef(showErrors)

  useEffect(() => {
    onDirtyChange(JSON.stringify(data) !== mountSnapshotJson)
  }, [data, mountSnapshotJson, onDirtyChange])

  const editedSections = useMemo(
    () => (isUpdate ? getEditedUpdateSections(changeBaseline, data) : []),
    [isUpdate, changeBaseline, data],
  )
  const hasChanges = useMemo(
    () => (isUpdate ? hasResourceDataChanges(changeBaseline, data) : false),
    [isUpdate, changeBaseline, data],
  )
  const isComplete = isExistingResourceComplete(data)

  useEffect(() => {
    if (!isUpdate || !onUpdateStateChange) return
    onUpdateStateChange({
      data,
      hasChanges,
      editedSections,
      isComplete,
    })
  }, [
    isUpdate,
    onUpdateStateChange,
    data,
    hasChanges,
    editedSections,
    isComplete,
  ])

  // When submit validation turns on, expand the first invalid section so
  // errors are not buried in a collapsed accordion.
  useEffect(() => {
    if (!isUpdate) return
    const justEnabled = showErrors && !prevShowErrorsRef.current
    prevShowErrorsRef.current = showErrors
    if (!justEnabled) return

    const firstInvalid = getFirstInvalidUpdateSection(data)
    if (!firstInvalid) return

    setExpandedSections((current) => {
      if (current.has(firstInvalid)) return current
      const next = new Set(current)
      next.add(firstInvalid)
      return next
    })

    window.requestAnimationFrame(() => {
      document
        .getElementById(`update-${firstInvalid}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [isUpdate, showErrors, data])

  const patch = (partial: Partial<ExistingResourceData>) => {
    setData((current) => ({ ...current, ...partial }))
  }

  const toggleSection = (sectionId: UpdateSectionId) => {
    setExpandedSections((current) => {
      const next = new Set(current)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const needsPhysical =
    data.accessMode === 'physical' || data.accessMode === 'both'

  useEffect(() => {
    if (!needsPhysical) setLocationsVerified(true)
  }, [needsPhysical])

  const syncRevealed = getRevealedSections(data)
  const revealed =
    isUpdate
      ? EXISTING_RESOURCE_SECTIONS.length
      : needsPhysical && !locationsVerified
        ? // Hold unlock on Location (section 4) until MapTiler verifies physical addresses.
          Math.min(syncRevealed, 4)
        : syncRevealed

  useEffect(() => {
    if (isUpdate) {
      onProgressChange?.(null)
      return
    }
    onProgressChange?.({
      sections: EXISTING_RESOURCE_SECTIONS,
      revealed,
    })
  }, [isUpdate, revealed, onProgressChange])

  useEffect(() => {
    return () => onProgressChange?.(null)
  }, [onProgressChange])

  const errors: FieldErrors = showErrors ? validateExistingResource(data) : {}
  const aboutErrors = showErrors ? validateSectionAbout(data) : {}
  const categoryErrors = showErrors ? validateSectionCategories(data) : {}
  const accessErrors = showErrors ? validateSectionAccess(data) : {}
  const contactErrors = showErrors ? validateSectionContacts(data) : {}

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
      if (!isExistingResourceComplete(data)) return null
      if (isUpdate && !hasResourceDataChanges(changeBaseline, data)) return null
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
      const meta = buildExistingResourceSummary(data, categories, tags)
      return {
        title: meta.title,
        summary: meta.summary,
        highlights: meta.highlights,
        status: 'complete',
        data,
      }
    })
  }, [
    data,
    changeBaseline,
    isUpdate,
    categories,
    tags,
    onRegisterSave,
    onShowErrorsChange,
  ])

  const needsOnline =
    data.accessMode === 'online' || data.accessMode === 'both'
  const needsCostDetails =
    data.costOption === 'other' ||
    data.costOption === 'paid' ||
    data.costOption === 'sliding_scale' ||
    data.costOption === 'donation'

  const aboutFields = (
    <>
      <Field
        id="resource-name"
        label="Resource name"
        required
        error={aboutErrors.name}
      >
        <Input
          id="resource-name"
          value={data.name}
          maxLength={RESOURCE_NAME_MAX_LENGTH}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. Rideau-Rockcliffe Community Food Cupboard"
          aria-invalid={Boolean(aboutErrors.name)}
        />
      </Field>

      <Field
        id="resource-description"
        label="Description"
        required
        hint="Explain what the resource provides and how it helps people."
        error={aboutErrors.description}
      >
        <Textarea
          id="resource-description"
          value={data.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="e.g. Offers emergency food hampers and referrals for residents facing food insecurity."
          aria-invalid={Boolean(aboutErrors.description)}
        />
      </Field>
    </>
  )

  const categoryFields = (
    <>
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
    </>
  )

  const accessModeFields = (
    <AccessModeSelector
      name="access-mode"
      value={data.accessMode}
      onChange={(accessMode) => {
        const needsSites = accessMode === 'physical' || accessMode === 'both'
        if (needsSites && data.locations.length === 0) {
          patch({ accessMode, locations: [createEmptyLocation()] })
        } else {
          patch({ accessMode })
        }
      }}
      error={accessErrors.accessMode}
    />
  )

  const onlineAccessField = needsOnline ? (
    <Field
      id="online-url"
      label="Website or online link"
      required
      hint="Enter the website or online link where people can access this resource."
      error={accessErrors.onlineUrl}
    >
      <Input
        id="online-url"
        type="url"
        value={data.onlineUrl}
        onChange={(e) => patch({ onlineUrl: e.target.value })}
        placeholder="https://example.org"
      />
    </Field>
  ) : null

  const physicalLocationFields = needsPhysical ? (
    <PhysicalLocationList
      ref={locationGeocodingRef}
      locations={data.locations}
      onChange={(locations) => patch({ locations })}
      showErrors={showErrors}
      locationFields={accessErrors.locationFields}
      listError={accessErrors.locations}
      requireAtLeastOne
      onVerifiedChange={setLocationsVerified}
    />
  ) : null

  const addressFields = (
    <>
      {accessModeFields}
      {data.accessMode === 'both' ? <AccessModeBothCallout /> : null}
      {needsPhysical && needsOnline ? (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {physicalLocationFields}
          {onlineAccessField}
        </div>
      ) : (
        <>
          {physicalLocationFields}
          {onlineAccessField}
        </>
      )}
    </>
  )

  const hoursFields = (
    <div className="space-y-3">
      <OptionCardGroup<HoursAvailability>
        name="hours-mode"
        legend="Hours"
        options={HOURS_MODE_OPTIONS}
        value={data.hoursAvailability}
        onChange={(hoursAvailability) => patch({ hoursAvailability })}
      />
      {data.hoursAvailability === 'structured' ? (
        <WeeklyHoursEditor
          hours={data.hours}
          onChange={(hours) => patch({ hours })}
          error={accessErrors.hours}
        />
      ) : null}
    </div>
  )

  const websiteFields = (
    <Field
      id="more-info"
      label="Where can people learn more? (optional)"
      error={errors.moreInfoUrl}
    >
      <Input
        id="more-info"
        value={data.moreInfoUrl}
        onChange={(e) => patch({ moreInfoUrl: e.target.value })}
        placeholder="https://"
      />
    </Field>
  )

  const contactFields = (
    <ContactMethodList
      contacts={data.contacts}
      onChange={(contacts) => patch({ contacts })}
      error={contactErrors.contacts}
      valueErrors={contactErrors.contactValues}
      showErrors={showErrors}
    />
  )

  const costFields = (
    <>
      <OptionCardGroup<CostOption>
        name="cost-option"
        legend="What does it cost to use this resource?"
        options={COST_OPTIONS}
        value={data.costOption}
        onChange={(costOption) => patch({ costOption })}
      />
      {needsCostDetails ? (
        <Field
          id="cost-details"
          label="Cost details"
          required={data.costOption === 'other'}
          error={errors.costDetails}
        >
          <Input
            id="cost-details"
            value={data.costDetails}
            onChange={(e) => patch({ costDetails: e.target.value })}
            placeholder="e.g. $5 per session, or by donation"
          />
        </Field>
      ) : null}
    </>
  )

  const accessibilityFields = (
    <Field
      id="accessibility"
      label="Accessibility"
      hint="Is there anything people should know about accessibility? You can also use the filters above when relevant ones are available."
    >
      <Textarea
        id="accessibility"
        value={data.accessibilityNotes}
        onChange={(e) => patch({ accessibilityNotes: e.target.value })}
        placeholder="e.g. Wheelchair accessible entrance, elevator available"
      />
    </Field>
  )

  const otherFields = (
    <>
      <Field id="eligibility" label="Who can use this resource?">
        <Textarea
          id="eligibility"
          value={data.eligibility}
          onChange={(e) => patch({ eligibility: e.target.value })}
          placeholder="e.g. Open to Rideau-Rockcliffe residents"
        />
      </Field>

      {!isUpdate ? (
        <>
          <Field
            id="more-info"
            label="Where can people learn more? (optional)"
            error={errors.moreInfoUrl}
          >
            <Input
              id="more-info"
              value={data.moreInfoUrl}
              onChange={(e) => patch({ moreInfoUrl: e.target.value })}
              placeholder="https://"
            />
          </Field>

          <Field
            id="general-notes"
            label="Anything else we should know? (optional)"
          >
            <Textarea
              id="general-notes"
              value={data.generalNotes}
              onChange={(e) => patch({ generalNotes: e.target.value })}
            />
          </Field>
        </>
      ) : null}
    </>
  )

  if (isUpdate) {
    const sectionContent: Record<UpdateSectionId, ReactNode> = {
      about: aboutFields,
      categories: categoryFields,
      address: addressFields,
      hours: hoursFields,
      website: websiteFields,
      contact: contactFields,
      cost: costFields,
      accessibility: accessibilityFields,
      other: otherFields,
    }

    const sectionDescriptions: Partial<Record<UpdateSectionId, string>> = {
      about: 'Name and description.',
      address: 'How people can access this resource.',
      hours: 'When this resource is available.',
      website: 'More-information links.',
      contact: 'Public phone, email, and other contact methods.',
      categories: 'Categories and discovery filters.',
      cost: 'Cost to use this resource.',
      accessibility: 'Accessibility details people should know.',
      other: 'Eligibility and any other details about who can use this resource.',
    }

    return (
      <div className="space-y-5">
        {UPDATE_SECTION_OPTIONS.map((option) => (
          <EditorSection
            key={option.id}
            id={`update-${option.id}`}
            title={option.label}
            description={sectionDescriptions[option.id]}
            expanded={expandedSections.has(option.id)}
            onToggle={() => toggleSection(option.id)}
            edited={editedSections.includes(option.id)}
          >
            {sectionContent[option.id]}
          </EditorSection>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <EditorSection
        id="about-resource"
        title="Tell us about this resource"
        description="Describe the organization, program, service, or place you would like to add. Do not worry if you do not know every detail—we will guide you through the rest."
      >
        {aboutFields}
      </EditorSection>

      {revealed >= 2 ? (
        <EditorSection
          id="categories-filters"
          title="Help people discover it"
          description="Choose categories that best fit this resource. You can also add optional filters to make it easier to find."
        >
          {categoryFields}
        </EditorSection>
      ) : null}

      {revealed >= 3 ? (
        <EditorSection id="contact" title="Public contact information">
          {contactFields}
        </EditorSection>
      ) : null}

      {revealed >= 4 ? (
        <EditorSection
          id="access"
          title="Location"
          description="Tell us how people can reach this resource."
        >
          {addressFields}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              When is this resource available?{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </p>
            {hoursFields}
          </div>
        </EditorSection>
      ) : null}

      {revealed >= 5 ? (
        <EditorSection
          id="additional"
          title="Additional details"
          description="Everything here is optional, but it helps people and staff understand the resource."
        >
          {costFields}
          {accessibilityFields}
          <Field id="eligibility" label="Who can use this resource?">
            <Textarea
              id="eligibility"
              value={data.eligibility}
              onChange={(e) => patch({ eligibility: e.target.value })}
              placeholder="e.g. Open to Rideau-Rockcliffe residents"
            />
          </Field>
          <Field
            id="more-info"
            label="Where can people learn more? (optional)"
            error={errors.moreInfoUrl}
          >
            <Input
              id="more-info"
              value={data.moreInfoUrl}
              onChange={(e) => patch({ moreInfoUrl: e.target.value })}
              placeholder="https://"
            />
          </Field>
          <Field
            id="general-notes"
            label="Anything else we should know? (optional)"
          >
            <Textarea
              id="general-notes"
              value={data.generalNotes}
              onChange={(e) => patch({ generalNotes: e.target.value })}
            />
          </Field>
        </EditorSection>
      ) : null}
    </div>
  )
}
