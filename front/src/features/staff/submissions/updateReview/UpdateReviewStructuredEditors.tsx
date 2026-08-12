import type { ReactNode } from 'react'
import type {
  AccessMode,
  CostOption,
  DayHours,
  ExistingResourceLocation,
  HoursAvailability,
  ResourceContactMethod,
} from '@/types/submission'
import { Input } from '@/components/ui'
import type { CostSlice } from '@/features/submissions/cost/costEquality'
import type { FieldErrors } from '@/features/submissions/existingResource/validation'
import {
  AccessModeBothCallout,
  AccessModeSelector,
} from '@/features/submissions/form/AccessModeSelector'
import { ContactMethodList } from '@/features/submissions/form/ContactMethodList'
import { Field } from '@/features/submissions/form/Field'
import {
  LookupMultiSelect,
  type LookupOption,
} from '@/features/submissions/form/LookupMultiSelect'
import { OptionCardGroup } from '@/features/submissions/form/OptionCardGroup'
import { PhysicalLocationList } from '@/features/submissions/form/PhysicalLocationList'
import { WeeklyHoursEditor } from '@/features/submissions/form/WeeklyHoursEditor'
import { isResourceUpdateStructuredFieldId } from '@/features/submissions/updateRequest/resourceUpdateStructuredFields'
import { cn } from '@/utils/cn'

const HOURS_MODE_OPTIONS: { value: HoursAvailability; label: string }[] = [
  { value: 'structured', label: 'Set weekly hours' },
  { value: 'varies', label: 'Hours vary' },
  { value: 'contact_for_hours', label: 'Contact the resource for hours' },
]

const COST_OPTIONS: { value: CostOption; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'sliding_scale', label: 'Sliding scale' },
  { value: 'donation', label: 'Donation requested' },
  { value: 'not_sure', label: 'Not sure' },
  { value: 'other', label: 'Other' },
]

export interface UpdateReviewStructuredEditorHandlers {
  getContacts: () => ResourceContactMethod[]
  onContactsChange: (contacts: ResourceContactMethod[]) => void
  getWebsites: () => ResourceContactMethod[]
  onWebsitesChange: (websites: ResourceContactMethod[]) => void
  getAccessMode: () => AccessMode | null
  onAccessModeChange: (accessMode: AccessMode) => void
  getLocations: () => ExistingResourceLocation[]
  onLocationsChange: (locations: ExistingResourceLocation[]) => void
  /** Live MapTiler verification for physical sites (Approve gate). */
  onLocationsVerifiedChange?: (verified: boolean) => void
  getCategoryIds: () => number[]
  onCategoryIdsChange: (categoryIds: number[]) => void
  getFilterIds: () => number[]
  onFilterIdsChange: (filterIds: number[]) => void
  getCost: () => CostSlice
  onCostChange: (slice: CostSlice) => void
  getHours: () => {
    hoursAvailability: HoursAvailability
    hours: DayHours[]
  }
  onHoursChange: (slice: {
    hoursAvailability: HoursAvailability
    hours: DayHours[]
  }) => void
  /**
   * Working Access Mode — drives Locations requireAtLeastOne so reviewer mode
   * changes immediately affect location requirements.
   */
  accessMode: AccessMode | null
  /** Catalog options already merged with any selected historical/unknown IDs. */
  categoryOptions: LookupOption[]
  filterOptions: LookupOption[]
  categoriesLoading?: boolean
  categoriesError?: string | null
  onCategoriesRetry?: () => void
  filtersLoading?: boolean
  filtersError?: string | null
  /** Shared validateExistingResource errors for the composed resource. */
  errors?: FieldErrors
  showErrors?: boolean
}

/**
 * Structured proposed-control for Update-review fields.
 * Returns null for non-structured fields so the host falls back to text inputs.
 */
export function renderUpdateReviewStructuredEditor(
  fieldId: string,
  disabled: boolean,
  handlers: UpdateReviewStructuredEditorHandlers,
): ReactNode | null {
  if (!isResourceUpdateStructuredFieldId(fieldId)) return null

  const errors = handlers.errors ?? {}
  const showErrors = handlers.showErrors ?? false

  return (
    <div
      className={cn(
        'rounded-lg border border-border-subtle bg-surface px-3 py-3',
        disabled && 'pointer-events-none cursor-not-allowed opacity-60',
      )}
      aria-disabled={disabled || undefined}
    >
      {fieldId === 'contact:contacts' ? (
        <ContactMethodList
          contacts={handlers.getContacts()}
          onChange={handlers.onContactsChange}
          allowedTypes={['phone', 'email', 'other']}
          description="Edit the contact methods that will be published for this resource."
          error={showErrors ? errors.contacts : undefined}
          valueErrors={showErrors ? errors.contactValues : undefined}
          showErrors={showErrors}
        />
      ) : null}

      {fieldId === 'website:websites' ? (
        <ContactMethodList
          contacts={handlers.getWebsites()}
          onChange={handlers.onWebsitesChange}
          allowedTypes={['website']}
          description="Edit the website contacts that will be published for this resource."
          error={showErrors ? errors.contacts : undefined}
          valueErrors={showErrors ? errors.contactValues : undefined}
          showErrors={showErrors}
        />
      ) : null}

      {fieldId === 'address:accessMode' ? (
        <div className="space-y-3">
          <AccessModeSelector
            name="update-review-access-mode"
            value={handlers.getAccessMode()}
            onChange={handlers.onAccessModeChange}
            error={showErrors ? errors.accessMode : undefined}
          />
          {handlers.getAccessMode() === 'both' ? (
            <AccessModeBothCallout />
          ) : null}
        </div>
      ) : null}

      {fieldId === 'address:locations' ? (
        <PhysicalLocationList
          locations={handlers.getLocations()}
          onChange={handlers.onLocationsChange}
          requireAtLeastOne={
            handlers.accessMode === 'physical' ||
            handlers.accessMode === 'both'
          }
          showErrors={showErrors}
          locationFields={showErrors ? errors.locationFields : undefined}
          listError={showErrors ? errors.locations : undefined}
          onVerifiedChange={handlers.onLocationsVerifiedChange}
        />
      ) : null}

      {fieldId === 'categories:categories' ? (
        <LookupMultiSelect
          label="Categories"
          required
          options={handlers.categoryOptions}
          value={handlers.getCategoryIds()}
          onChange={handlers.onCategoryIdsChange}
          isLoading={handlers.categoriesLoading}
          error={handlers.categoriesError}
          onRetry={handlers.onCategoriesRetry}
          fieldError={showErrors ? errors.categories : undefined}
        />
      ) : null}

      {fieldId === 'categories:filters' ? (
        <LookupMultiSelect
          label="Filters"
          options={handlers.filterOptions}
          value={handlers.getFilterIds()}
          onChange={handlers.onFilterIdsChange}
          isLoading={handlers.filtersLoading}
          error={handlers.filtersError}
          emptyMessage="No filters are available yet."
        />
      ) : null}

      {fieldId === 'cost:cost' ? (
        <CostStructuredEditor
          value={handlers.getCost()}
          onChange={handlers.onCostChange}
          costDetailsError={showErrors ? errors.costDetails : undefined}
        />
      ) : null}

      {fieldId === 'hours:hours' ? (
        <HoursStructuredEditor
          value={handlers.getHours()}
          onChange={handlers.onHoursChange}
          hoursError={showErrors ? errors.hours : undefined}
        />
      ) : null}
    </div>
  )
}

function CostStructuredEditor({
  value,
  onChange,
  costDetailsError,
}: {
  value: CostSlice
  onChange: (slice: CostSlice) => void
  costDetailsError?: string
}) {
  const needsCostDetails =
    value.costOption === 'other' ||
    value.costOption === 'paid' ||
    value.costOption === 'sliding_scale' ||
    value.costOption === 'donation'

  return (
    <div className="space-y-3">
      <OptionCardGroup<CostOption>
        name="update-review-cost-option"
        legend="What does it cost to use this resource?"
        options={COST_OPTIONS}
        value={value.costOption}
        onChange={(costOption) => onChange({ ...value, costOption })}
      />
      {needsCostDetails ? (
        <Field
          id="update-review-cost-details"
          label="Cost details"
          required={value.costOption === 'other'}
          error={costDetailsError}
        >
          <Input
            id="update-review-cost-details"
            value={value.costDetails}
            onChange={(event) =>
              onChange({ ...value, costDetails: event.target.value })
            }
            placeholder="e.g. $5 per session, or by donation"
          />
        </Field>
      ) : null}
    </div>
  )
}

function HoursStructuredEditor({
  value,
  onChange,
  hoursError,
}: {
  value: { hoursAvailability: HoursAvailability; hours: DayHours[] }
  onChange: (slice: {
    hoursAvailability: HoursAvailability
    hours: DayHours[]
  }) => void
  hoursError?: string
}) {
  return (
    <div className="space-y-3">
      <OptionCardGroup<HoursAvailability>
        name="update-review-hours-mode"
        legend="Hours"
        options={HOURS_MODE_OPTIONS}
        value={value.hoursAvailability}
        onChange={(hoursAvailability) =>
          onChange({ ...value, hoursAvailability })
        }
      />
      {value.hoursAvailability === 'structured' ? (
        <WeeklyHoursEditor
          hours={value.hours}
          onChange={(hours) => onChange({ ...value, hours })}
          error={hoursError}
        />
      ) : hoursError ? (
        <p className="text-sm text-danger" role="alert">
          {hoursError}
        </p>
      ) : null}
    </div>
  )
}
