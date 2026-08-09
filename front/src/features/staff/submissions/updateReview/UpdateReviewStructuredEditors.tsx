import type { ReactNode } from 'react'
import type {
  AccessMode,
  DayHours,
  ExistingResourceLocation,
  HoursAvailability,
  ResourceContactMethod,
} from '@/types/submission'
import type { FieldErrors } from '@/features/submissions/existingResource/validation'
import {
  AccessModeBothCallout,
  AccessModeSelector,
} from '@/features/submissions/form/AccessModeSelector'
import { ContactMethodList } from '@/features/submissions/form/ContactMethodList'
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

export interface UpdateReviewStructuredEditorHandlers {
  getContacts: () => ResourceContactMethod[]
  onContactsChange: (contacts: ResourceContactMethod[]) => void
  getAccessMode: () => AccessMode | null
  onAccessModeChange: (accessMode: AccessMode) => void
  getLocations: () => ExistingResourceLocation[]
  onLocationsChange: (locations: ExistingResourceLocation[]) => void
  getCategoryIds: () => number[]
  onCategoryIdsChange: (categoryIds: number[]) => void
  getFilterIds: () => number[]
  onFilterIdsChange: (filterIds: number[]) => void
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
          description="Edit the contact methods that will be published for this resource."
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
