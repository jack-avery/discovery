import { useEffect, useMemo, useState } from 'react'
import { Input, Textarea } from '@/components/ui'
import { useCategories } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import type {
  AccessMode,
  CostOption,
  ExistingResourceData,
  HoursAvailability,
  RelationshipOption,
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
  validateSectionRelationship,
  type FieldErrors,
} from './validation'
import { ContactMethodList } from '../form/ContactMethodList'
import { EditorSection } from '../form/EditorSection'
import { Field } from '../form/Field'
import { LookupMultiSelect } from '../form/LookupMultiSelect'
import { OptionCardGroup } from '../form/OptionCardGroup'
import { PhysicalLocationList } from '../form/PhysicalLocationList'
import { WeeklyHoursEditor } from '../form/WeeklyHoursEditor'
import type { Contribution } from '@/types/submission'

interface ExistingResourceEditorProps {
  /** Existing contribution when editing; null when creating. */
  initialContribution: Contribution | null
  showErrors: boolean
  onShowErrorsChange: (show: boolean) => void
  onDirtyChange: (dirty: boolean) => void
  onRegisterSave: (save: () => SavedContributionPayload | null) => void
  onProgressChange?: (progress: {
    sections: readonly string[]
    revealed: number
  } | null) => void
}

const ACCESS_OPTIONS = [
  { value: 'physical' as const, label: 'At a physical location' },
  { value: 'online' as const, label: 'Online' },
  { value: 'both' as const, label: 'Both' },
]

const COST_OPTIONS: { value: CostOption; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'sliding_scale', label: 'Sliding scale' },
  { value: 'donation', label: 'Donation requested' },
  { value: 'not_sure', label: 'Not sure' },
  { value: 'other', label: 'Other' },
]

const RELATIONSHIP_OPTIONS: { value: RelationshipOption; label: string }[] = [
  { value: 'represent', label: 'I represent this organization or service' },
  { value: 'volunteer', label: 'I volunteer here' },
  { value: 'user', label: 'I use this resource' },
  { value: 'someone_told_me', label: 'Someone told me about it' },
  { value: 'public_info', label: 'I found it through public information' },
  { value: 'other', label: 'Other' },
]

const HOURS_MODE_OPTIONS: { value: HoursAvailability; label: string }[] = [
  { value: 'structured', label: 'Set weekly hours' },
  { value: 'varies', label: 'Hours vary' },
  { value: 'contact_for_hours', label: 'Contact the resource for hours' },
]

function initialDataFromContribution(
  contribution: Contribution | null,
): ExistingResourceData {
  if (contribution && isExistingResourceData(contribution.data)) {
    return normalizeExistingResourceData(
      JSON.parse(JSON.stringify(contribution.data)) as ExistingResourceData,
    )
  }
  return createEmptyExistingResourceData()
}

export function ExistingResourceEditor({
  initialContribution,
  showErrors,
  onShowErrorsChange,
  onDirtyChange,
  onRegisterSave,
  onProgressChange,
}: ExistingResourceEditorProps) {
  const { categories, isLoading: categoriesLoading, error: categoriesError } =
    useCategories()
  const { tags, isLoading: tagsLoading, error: tagsError } = useTags()

  const [data, setData] = useState<ExistingResourceData>(() =>
    initialDataFromContribution(initialContribution),
  )
  const [baseline] = useState(() =>
    JSON.stringify(initialDataFromContribution(initialContribution)),
  )

  useEffect(() => {
    onDirtyChange(JSON.stringify(data) !== baseline)
  }, [data, baseline, onDirtyChange])

  const patch = (partial: Partial<ExistingResourceData>) => {
    setData((current) => ({ ...current, ...partial }))
  }

  const revealed = getRevealedSections(data)

  useEffect(() => {
    onProgressChange?.({
      sections: EXISTING_RESOURCE_SECTIONS,
      revealed,
    })
  }, [revealed, onProgressChange])

  useEffect(() => {
    return () => onProgressChange?.(null)
  }, [onProgressChange])

  const errors: FieldErrors = showErrors ? validateExistingResource(data) : {}
  const aboutErrors = showErrors ? validateSectionAbout(data) : {}
  const categoryErrors = showErrors ? validateSectionCategories(data) : {}
  const accessErrors = showErrors ? validateSectionAccess(data) : {}
  const contactErrors = showErrors ? validateSectionContacts(data) : {}
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
      if (!isExistingResourceComplete(data)) return null
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
    categories,
    tags,
    onRegisterSave,
    onShowErrorsChange,
  ])

  const needsPhysical =
    data.accessMode === 'physical' || data.accessMode === 'both'
  const needsOnline =
    data.accessMode === 'online' || data.accessMode === 'both'
  const needsCostDetails =
    data.costOption === 'other' ||
    data.costOption === 'paid' ||
    data.costOption === 'sliding_scale' ||
    data.costOption === 'donation'

  return (
    <div className="space-y-5">
      <EditorSection
        id="about-resource"
        title="Tell us about this resource"
        description="Describe the organization, program, service, or place you would like to add. Do not worry if you do not know every detail—we will guide you through the rest."
      >
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
      </EditorSection>

      {revealed >= 2 ? (
        <EditorSection
          id="categories-filters"
          title="Help people discover it"
          description="Choose categories that best fit this resource. You can also add optional filters to make it easier to find."
        >
          <LookupMultiSelect
            label="Categories"
            required
            options={categoryOptions}
            value={data.categoryIds}
            onChange={(categoryIds) => patch({ categoryIds })}
            isLoading={categoriesLoading}
            error={categoriesError}
            fieldError={categoryErrors.categories}
          />

          <LookupMultiSelect
            label="Help people find this resource"
            options={filterOptions}
            value={data.filterIds}
            onChange={(filterIds) => patch({ filterIds })}
            isLoading={tagsLoading}
            error={tagsError}
            emptyMessage="No additional filters are available yet."
          />
        </EditorSection>
      ) : null}

      {revealed >= 3 ? (
        <EditorSection
          id="access"
          title="How can people access this resource?"
        >
          <OptionCardGroup<AccessMode>
            name="access-mode"
            legend="Access type"
            options={ACCESS_OPTIONS}
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
            error={accessErrors.accessMode}
          />

          {needsPhysical ? (
            <PhysicalLocationList
              locations={data.locations}
              onChange={(locations) => patch({ locations })}
              showErrors={showErrors}
              locationFields={accessErrors.locationFields}
              listError={accessErrors.locations}
              requireAtLeastOne
            />
          ) : null}

          {needsOnline ? (
            <Field
              id="online-url"
              label="Where can people access it online?"
              required
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
          ) : null}

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              When is this resource available?{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </p>
            <OptionCardGroup<HoursAvailability>
              name="hours-mode"
              legend="Hours"
              options={HOURS_MODE_OPTIONS}
              value={data.hoursAvailability}
              onChange={(hoursAvailability) => patch({ hoursAvailability })}
              className="sm:grid-cols-3"
            />
            {data.hoursAvailability === 'structured' ? (
              <WeeklyHoursEditor
                hours={data.hours}
                onChange={(hours) => patch({ hours })}
                error={accessErrors.hours}
              />
            ) : null}
          </div>
        </EditorSection>
      ) : null}

      {revealed >= 4 ? (
        <EditorSection
          id="contact"
          title="Public contact information"
        >
          <ContactMethodList
            contacts={data.contacts}
            onChange={(contacts) => patch({ contacts })}
            error={contactErrors.contacts}
            valueErrors={contactErrors.contactValues}
            showErrors={showErrors}
          />
        </EditorSection>
      ) : null}

      {revealed >= 5 ? (
        <EditorSection
          id="additional"
          title="Additional details"
          description="Everything here is optional, but it helps people and staff understand the resource."
        >
          <OptionCardGroup<CostOption>
            name="cost-option"
            legend="What does it cost to use this resource?"
            options={COST_OPTIONS}
            value={data.costOption}
            onChange={(costOption) => patch({ costOption })}
            className="sm:grid-cols-2"
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
            label="Anything else RRCRC staff should know? (optional)"
          >
            <Textarea
              id="general-notes"
              value={data.generalNotes}
              onChange={(e) => patch({ generalNotes: e.target.value })}
            />
          </Field>
        </EditorSection>
      ) : null}

      {revealed >= 6 ? (
        <EditorSection
          id="connection"
          title="How are you connected to this resource?"
          description="This helps our team understand your submission. It will not appear publicly on the map."
        >
          <OptionCardGroup<RelationshipOption>
            name="relationship"
            legend="Your connection"
            options={RELATIONSHIP_OPTIONS}
            value={data.relationship}
            onChange={(relationship) => patch({ relationship })}
            error={relationshipErrors.relationship}
            className="sm:grid-cols-1"
          />
          {data.relationship === 'other' ? (
            <Field
              id="relationship-other"
              label="Please explain"
              required
              error={relationshipErrors.relationshipOther}
            >
              <Input
                id="relationship-other"
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
