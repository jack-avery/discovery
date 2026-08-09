import { Input, Textarea } from '@/components/ui'
import type { Ref } from 'react'
import type {
  CostOption,
  ExistingResourceData,
  HoursAvailability,
} from '@/types/submission'
import { RESOURCE_NAME_MAX_LENGTH } from '@/types/submission'
import { Field } from '@/features/submissions/form/Field'
import { LookupMultiSelect } from '@/features/submissions/form/LookupMultiSelect'
import { OptionCardGroup } from '@/features/submissions/form/OptionCardGroup'
import {
  AccessModeBothCallout,
  AccessModeSelector,
} from '@/features/submissions/form/AccessModeSelector'
import { PhysicalLocationList } from '@/features/submissions/form/PhysicalLocationList'
import type { PhysicalLocationGeocodingHandle } from '@/features/submissions/form/PhysicalLocationList'
import { WeeklyHoursEditor } from '@/features/submissions/form/WeeklyHoursEditor'
import { ContactMethodList } from '@/features/submissions/form/ContactMethodList'
import { createEmptyLocation } from '@/features/submissions/existingResource/emptyState'
import type { FieldErrors } from '@/features/submissions/existingResource/validation'
import type { Category } from '@/types/category'
import type { Tag } from '@/types/tag'

export { SectionEditChrome } from '@/features/staff/submissions/SectionEditChrome'

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

interface SharedEditorProps {
  data: ExistingResourceData
  patch: (partial: Partial<ExistingResourceData>) => void
  errors: FieldErrors
  showErrors: boolean
}

export function NewResourceIdentityFields({
  data,
  patch,
  errors,
  categories,
  tags,
  categoriesLoading,
  tagsLoading,
  categoriesError,
  tagsError,
  onCategoriesRetry,
}: SharedEditorProps & {
  categories: Category[]
  tags: Tag[]
  categoriesLoading: boolean
  tagsLoading: boolean
  categoriesError: string | null
  tagsError: string | null
  onCategoriesRetry?: () => void
}) {
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
    <div className="space-y-4">
      <Field
        id="review-resource-name"
        label="Resource name"
        required
        error={errors.name}
      >
        <Input
          id="review-resource-name"
          value={data.name}
          maxLength={RESOURCE_NAME_MAX_LENGTH}
          onChange={(event) => patch({ name: event.target.value })}
          placeholder="e.g. Rideau-Rockcliffe Community Food Cupboard"
          aria-invalid={Boolean(errors.name)}
        />
      </Field>

      <LookupMultiSelect
        label="Categories"
        required
        options={categoryOptions}
        value={data.categoryIds}
        onChange={(categoryIds) => patch({ categoryIds })}
        isLoading={categoriesLoading}
        error={categoriesError}
        onRetry={onCategoriesRetry}
        fieldError={errors.categories}
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
  )
}

export function NewResourceAboutFields({
  data,
  patch,
  errors,
}: SharedEditorProps) {
  return (
    <div className="space-y-4">
      <Field
        id="review-resource-description"
        label="Description"
        required
        hint="Explain what the resource provides and how it helps people."
        error={errors.description}
      >
        <Textarea
          id="review-resource-description"
          value={data.description}
          onChange={(event) => patch({ description: event.target.value })}
          placeholder="e.g. Offers emergency food hampers and referrals for residents facing food insecurity."
          aria-invalid={Boolean(errors.description)}
        />
      </Field>

      <Field
        id="review-general-notes"
        label="Anything else we should know? (optional)"
      >
        <Textarea
          id="review-general-notes"
          value={data.generalNotes}
          onChange={(event) => patch({ generalNotes: event.target.value })}
        />
      </Field>
    </div>
  )
}

export function NewResourceLocationFields({
  data,
  patch,
  errors,
  showErrors,
  locationGeocodingRef,
  onVerifiedChange,
}: SharedEditorProps & {
  locationGeocodingRef: Ref<PhysicalLocationGeocodingHandle>
  onVerifiedChange: (verified: boolean) => void
}) {
  const needsPhysical =
    data.accessMode === 'physical' || data.accessMode === 'both'
  const needsOnline =
    data.accessMode === 'online' || data.accessMode === 'both'

  return (
    <div className="space-y-4">
      <AccessModeSelector
        name="review-access-mode"
        value={data.accessMode}
        onChange={(accessMode) => {
          const needsSites = accessMode === 'physical' || accessMode === 'both'
          if (needsSites && data.locations.length === 0) {
            patch({ accessMode, locations: [createEmptyLocation()] })
          } else {
            patch({ accessMode })
          }
        }}
        error={errors.accessMode}
      />
      {data.accessMode === 'both' ? <AccessModeBothCallout /> : null}

      {needsPhysical ? (
        <PhysicalLocationList
          ref={locationGeocodingRef}
          locations={data.locations}
          onChange={(locations) => patch({ locations })}
          showErrors={showErrors}
          locationFields={errors.locationFields}
          listError={errors.locations}
          requireAtLeastOne
          onVerifiedChange={onVerifiedChange}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No physical location required for online-only access. Switch access
          mode above to add sites.
        </p>
      )}

      {needsOnline ? (
        <Field
          id="review-online-url"
          label="Website or online link"
          required
          hint="Enter the website or online link where people can access this resource."
          error={errors.onlineUrl}
        >
          <Input
            id="review-online-url"
            type="url"
            value={data.onlineUrl}
            onChange={(event) => patch({ onlineUrl: event.target.value })}
            placeholder="https://example.org"
          />
        </Field>
      ) : null}
    </div>
  )
}

export function NewResourceContactFields({
  data,
  patch,
  errors,
  showErrors,
}: SharedEditorProps) {
  return (
    <ContactMethodList
      contacts={data.contacts}
      onChange={(contacts) => patch({ contacts })}
      error={errors.contacts}
      valueErrors={errors.contactValues}
      showErrors={showErrors}
    />
  )
}

export function NewResourceServiceFields({
  data,
  patch,
  errors,
  showErrors: _showErrors,
}: SharedEditorProps) {
  const needsCostDetails =
    data.costOption === 'other' ||
    data.costOption === 'paid' ||
    data.costOption === 'sliding_scale' ||
    data.costOption === 'donation'

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <OptionCardGroup<HoursAvailability>
          name="review-hours-mode"
          legend="Hours"
          options={HOURS_MODE_OPTIONS}
          value={data.hoursAvailability}
          onChange={(hoursAvailability) => patch({ hoursAvailability })}
        />
        {data.hoursAvailability === 'structured' ? (
          <WeeklyHoursEditor
            hours={data.hours}
            onChange={(hours) => patch({ hours })}
            error={errors.hours}
          />
        ) : null}
      </div>

      <div className="space-y-3">
        <OptionCardGroup<CostOption>
          name="review-cost-option"
          legend="What does it cost to use this resource?"
          options={COST_OPTIONS}
          value={data.costOption}
          onChange={(costOption) => patch({ costOption })}
        />
        {needsCostDetails ? (
          <Field
            id="review-cost-details"
            label="Cost details"
            required={data.costOption === 'other'}
            error={errors.costDetails}
          >
            <Input
              id="review-cost-details"
              value={data.costDetails}
              onChange={(event) => patch({ costDetails: event.target.value })}
              placeholder="e.g. $5 per session, or by donation"
            />
          </Field>
        ) : null}
      </div>

      <Field
        id="review-accessibility"
        label="Accessibility"
        hint="Is there anything people should know about accessibility?"
      >
        <Textarea
          id="review-accessibility"
          value={data.accessibilityNotes}
          onChange={(event) =>
            patch({ accessibilityNotes: event.target.value })
          }
          placeholder="e.g. Wheelchair accessible entrance, elevator available"
        />
      </Field>

      <Field id="review-eligibility" label="Who can use this resource?">
        <Textarea
          id="review-eligibility"
          value={data.eligibility}
          onChange={(event) => patch({ eligibility: event.target.value })}
          placeholder="e.g. Open to Rideau-Rockcliffe residents"
        />
      </Field>

      <Field
        id="review-more-info"
        label="Where can people learn more? (optional)"
        error={errors.moreInfoUrl}
      >
        <Input
          id="review-more-info"
          value={data.moreInfoUrl}
          onChange={(event) => patch({ moreInfoUrl: event.target.value })}
          placeholder="https://"
        />
      </Field>
    </div>
  )
}
