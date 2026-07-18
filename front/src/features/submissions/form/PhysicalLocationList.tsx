import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
} from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import type { ExistingResourceLocation } from '@/types/submission'
import { normalizeCanadianPostalCode } from '@/utils/canadianPostalCode'
import {
  createEmptyLocation,
  getLocationHeading,
  isLocationBlank,
} from '../existingResource/emptyState'
import type { LocationFieldErrors } from './locationFieldValidation'
import { Field } from './Field'
import { ConfirmDialog } from './ConfirmDialog'
import {
  DUPLICATE_LOCATION_MESSAGE,
  isDuplicateLocation,
} from './locationIdentity'
import {
  usePhysicalLocationGeocoding,
  type PhysicalLocationGeocodingHandle,
} from './usePhysicalLocationGeocoding'

export type { PhysicalLocationGeocodingHandle }

interface PhysicalLocationListProps {
  locations: ExistingResourceLocation[]
  onChange: (locations: ExistingResourceLocation[]) => void
  showErrors?: boolean
  locationFields?: Record<string, LocationFieldErrors>
  listError?: string
  /** When true, at least one location must remain. */
  requireAtLeastOne?: boolean
  /** Notifies when MapTiler verification allows progressive unlock. */
  onVerifiedChange?: (verified: boolean) => void
}

export const PhysicalLocationList = forwardRef<
  PhysicalLocationGeocodingHandle,
  PhysicalLocationListProps
>(function PhysicalLocationList(
  {
    locations,
    onChange,
    showErrors = false,
    locationFields = {},
    listError,
    requireAtLeastOne = true,
    onVerifiedChange,
  },
  ref,
) {
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [blurredLocationIds, setBlurredLocationIds] = useState<Set<string>>(
    () => new Set(),
  )
  const focusLocationIdRef = useRef<string | null>(null)
  const locationsRef = useRef(locations)
  locationsRef.current = locations
  const listHeadingId = useId()
  const addControlId = useId()

  const geocoding = usePhysicalLocationGeocoding({
    locations,
    showErrors,
    onVerifiedChange,
    onCoordinatesChange: (locationId, coordinates) => {
      onChange(
        locationsRef.current.map((loc) =>
          loc.id === locationId
            ? {
                ...loc,
                lat: coordinates?.lat ?? null,
                lng: coordinates?.lng ?? null,
              }
            : loc,
        ),
      )
    },
  })

  useImperativeHandle(
    ref,
    () => ({
      canProceed: geocoding.canProceed,
      ensureValidated: geocoding.ensureValidated,
      focusFirstInvalidField: geocoding.focusFirstInvalidField,
    }),
    [
      geocoding.canProceed,
      geocoding.ensureValidated,
      geocoding.focusFirstInvalidField,
    ],
  )

  useEffect(() => {
    const id = focusLocationIdRef.current
    if (!id) return
    focusLocationIdRef.current = null
    const input = document.getElementById(`location-${id}-name`)
    if (input instanceof HTMLElement) {
      input.focus()
      input.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [locations])

  const duplicateErrors = useMemo(() => {
    const result: Record<string, LocationFieldErrors> = {}
    locations.forEach((location, index) => {
      const shouldCheck = showErrors || blurredLocationIds.has(location.id)
      if (!shouldCheck) return
      const duplicateOfEarlier = locations
        .slice(0, index)
        .some((earlier) => isDuplicateLocation(earlier, location))
      if (duplicateOfEarlier) {
        result[location.id] = { streetAddress: DUPLICATE_LOCATION_MESSAGE }
      }
    })
    return result
  }, [locations, showErrors, blurredLocationIds])

  const markBlurred = (id: string) => {
    setBlurredLocationIds((current) => {
      if (current.has(id)) return current
      const next = new Set(current)
      next.add(id)
      return next
    })
  }

  const ADDRESS_FIELDS = [
    'streetAddress',
    'unit',
    'city',
    'province',
    'postalCode',
  ] as const

  const update = (
    id: string,
    patch: Partial<ExistingResourceLocation>,
  ) => {
    const addressChanged = ADDRESS_FIELDS.some((field) => field in patch)
    onChange(
      locations.map((loc) => {
        if (loc.id !== id) return loc
        return {
          ...loc,
          ...(addressChanged ? { lat: null, lng: null } : {}),
          ...patch,
        }
      }),
    )
  }

  const handleLocationFieldBlur = (location: ExistingResourceLocation) => {
    markBlurred(location.id)

    const normalizedPostal = normalizeCanadianPostalCode(location.postalCode)
    const nextLocation =
      normalizedPostal && normalizedPostal !== location.postalCode
        ? { ...location, postalCode: normalizedPostal }
        : location

    if (normalizedPostal && normalizedPostal !== location.postalCode) {
      update(location.id, { postalCode: normalizedPostal })
    }

    geocoding.validateOnBlur(nextLocation)
  }

  const requestRemove = (id: string) => {
    if (requireAtLeastOne && locations.length <= 1) return
    const target = locations.find((loc) => loc.id === id)
    if (!target) return
    if (isLocationBlank(target)) {
      removeLocation(id)
      return
    }
    setPendingRemoveId(id)
  }

  const removeLocation = (id: string) => {
    const next = locations.filter((loc) => loc.id !== id)
    onChange(next)
    setPendingRemoveId(null)
    setBlurredLocationIds((current) => {
      const nextSet = new Set(current)
      nextSet.delete(id)
      return nextSet
    })
    window.setTimeout(() => {
      document.getElementById(addControlId)?.focus()
    }, 0)
  }

  const addLocation = () => {
    if (locations.some(isLocationBlank)) return
    const hasDuplicate = locations.some((location, index) =>
      locations
        .slice(0, index)
        .some((earlier) => isDuplicateLocation(earlier, location)),
    )
    if (hasDuplicate) {
      locations.forEach((location, index) => {
        const duplicateOfEarlier = locations
          .slice(0, index)
          .some((earlier) => isDuplicateLocation(earlier, location))
        if (duplicateOfEarlier) markBlurred(location.id)
      })
      return
    }
    const next = createEmptyLocation()
    focusLocationIdRef.current = next.id
    onChange([...locations, next])
  }

  const pendingLocation = pendingRemoveId
    ? locations.find((loc) => loc.id === pendingRemoveId)
    : null
  const pendingIndex = pendingLocation
    ? locations.findIndex((loc) => loc.id === pendingLocation.id)
    : -1
  const pendingHeading =
    pendingLocation && pendingIndex >= 0
      ? getLocationHeading(pendingLocation, pendingIndex)
      : 'this location'

  const handleListFocusOut = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    // User left the address block (next section, hours, online URL, etc.).
    void geocoding.ensureValidated({ focusOnFailure: true })
  }

  return (
    <div className="space-y-3" onBlur={handleListFocusOut}>
      <p id={listHeadingId} className="text-sm font-medium text-foreground">
        Physical locations
      </p>

      <ul className="space-y-3" aria-labelledby={listHeadingId}>
        {locations.map((location, index) => {
          const heading = getLocationHeading(location, index)
          const fieldErrors = showErrors
            ? locationFields[location.id]
            : undefined
          const geocodingError = geocoding.getGeocodingError(location)
          const duplicateStreet = duplicateErrors[location.id]?.streetAddress
          const errors: LocationFieldErrors = {
            ...fieldErrors,
            ...duplicateErrors[location.id],
            ...(geocodingError && !duplicateStreet
              ? { streetAddress: geocodingError }
              : {}),
          }
          const canRemove = !requireAtLeastOne || locations.length > 1
          const sectionId = `physical-location-${location.id}`
          const geocodeState = geocoding.states[location.id]
          const isValidating =
            geocodeState?.status === 'validating' && !geocodingError

          return (
            <li
              key={location.id}
              id={sectionId}
              className="space-y-3 rounded-xl border border-border-subtle p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h4
                  id={`${sectionId}-heading`}
                  className="font-heading text-sm font-semibold text-foreground"
                >
                  {heading}
                </h4>
                {canRemove ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => requestRemove(location.id)}
                    aria-label={`Remove ${heading}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Remove
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    At least one location is required
                  </p>
                )}
              </div>

              {isValidating ? (
                <p className="text-xs text-muted-foreground" role="status">
                  Verifying address…
                </p>
              ) : null}

              <Field
                id={`location-${location.id}-name`}
                label="Location name (optional)"
                hint="e.g. Main office, East entrance"
              >
                <Input
                  id={`location-${location.id}-name`}
                  value={location.locationName}
                  onChange={(e) =>
                    update(location.id, { locationName: e.target.value })
                  }
                />
              </Field>

              <Field
                id={`location-${location.id}-street`}
                label="Street address"
                required
                error={errors.streetAddress}
              >
                <Input
                  id={`location-${location.id}-street`}
                  value={location.streetAddress}
                  onChange={(e) =>
                    update(location.id, { streetAddress: e.target.value })
                  }
                  onBlur={() => handleLocationFieldBlur(location)}
                  placeholder="123 Main Street"
                />
              </Field>

              <Field
                id={`location-${location.id}-unit`}
                label="Unit / suite (optional)"
              >
                <Input
                  id={`location-${location.id}-unit`}
                  value={location.unit}
                  onChange={(e) =>
                    update(location.id, { unit: e.target.value })
                  }
                  onBlur={() => handleLocationFieldBlur(location)}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  id={`location-${location.id}-city`}
                  label="City"
                  required
                  error={errors.city}
                >
                  <Input
                    id={`location-${location.id}-city`}
                    value={location.city}
                    onChange={(e) =>
                      update(location.id, { city: e.target.value })
                    }
                    onBlur={() => handleLocationFieldBlur(location)}
                  />
                </Field>
                <Field
                  id={`location-${location.id}-province`}
                  label="Province"
                  required
                  error={errors.province}
                >
                  <Input
                    id={`location-${location.id}-province`}
                    value={location.province}
                    onChange={(e) =>
                      update(location.id, { province: e.target.value })
                    }
                    onBlur={() => handleLocationFieldBlur(location)}
                  />
                </Field>
              </div>

              <Field
                id={`location-${location.id}-postal`}
                label="Postal code"
                required
                error={errors.postalCode}
              >
                <Input
                  id={`location-${location.id}-postal`}
                  value={location.postalCode}
                  onChange={(e) =>
                    update(location.id, { postalCode: e.target.value })
                  }
                  onBlur={() => handleLocationFieldBlur(location)}
                  placeholder="K1N 5T5"
                />
              </Field>
            </li>
          )
        })}
      </ul>

      <Button
        id={addControlId}
        type="button"
        variant="outline"
        size="sm"
        disabled={locations.some(isLocationBlank)}
        onClick={addLocation}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add another location
      </Button>

      {showErrors && listError ? (
        <p className="text-xs text-danger" role="alert">
          {listError}
        </p>
      ) : null}

      <ConfirmDialog
        open={pendingRemoveId !== null}
        title="Remove location?"
        description={`Remove ${pendingHeading}? Entered details for this location will be lost.`}
        cancelLabel="Keep location"
        confirmLabel="Remove location"
        onCancel={() => setPendingRemoveId(null)}
        onConfirm={() => {
          if (pendingRemoveId) removeLocation(pendingRemoveId)
        }}
      />
    </div>
  )
})
