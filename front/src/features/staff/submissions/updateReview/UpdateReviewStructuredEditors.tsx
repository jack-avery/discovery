import type { ReactNode } from 'react'
import type {
  DayHours,
  ExistingResourceData,
  ExistingResourceLocation,
  HoursAvailability,
  ResourceContactMethod,
} from '@/types/submission'
import type { FieldErrors } from '@/features/submissions/existingResource/validation'
import { ContactMethodList } from '@/features/submissions/form/ContactMethodList'
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
  getLocations: () => ExistingResourceLocation[]
  onLocationsChange: (locations: ExistingResourceLocation[]) => void
  getHours: () => {
    hoursAvailability: HoursAvailability
    hours: DayHours[]
  }
  onHoursChange: (slice: {
    hoursAvailability: HoursAvailability
    hours: DayHours[]
  }) => void
  /** Used only to decide requireAtLeastOne for locations. */
  accessMode: ExistingResourceData['accessMode']
  /** Shared validateExistingResource errors for the composed resource. */
  errors?: FieldErrors
  showErrors?: boolean
}

/**
 * Structured proposed-control for contacts / locations / hours in Update review.
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
