import { useEffect, useId, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import type { ExistingResourceLocation } from '@/types/submission'
import {
  createEmptyLocation,
  getLocationHeading,
  isLocationBlank,
} from '../existingResource/emptyState'
import type { LocationFieldErrors } from '../existingResource/validation'
import { Field } from './Field'
import { ConfirmDialog } from './ConfirmDialog'

interface PhysicalLocationListProps {
  locations: ExistingResourceLocation[]
  onChange: (locations: ExistingResourceLocation[]) => void
  showErrors?: boolean
  locationFields?: Record<string, LocationFieldErrors>
  listError?: string
  /** When true, at least one location must remain. */
  requireAtLeastOne?: boolean
}

export function PhysicalLocationList({
  locations,
  onChange,
  showErrors,
  locationFields = {},
  listError,
  requireAtLeastOne = true,
}: PhysicalLocationListProps) {
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const focusLocationIdRef = useRef<string | null>(null)
  const listHeadingId = useId()
  const addControlId = useId()

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

  const update = (
    id: string,
    patch: Partial<ExistingResourceLocation>,
  ) => {
    onChange(locations.map((loc) => (loc.id === id ? { ...loc, ...patch } : loc)))
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
    window.setTimeout(() => {
      document.getElementById(addControlId)?.focus()
    }, 0)
  }

  const addLocation = () => {
    if (locations.some(isLocationBlank)) return
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

  return (
    <div className="space-y-3">
      <p id={listHeadingId} className="text-sm font-medium text-foreground">
        Physical locations
      </p>

      <ul className="space-y-3" aria-labelledby={listHeadingId}>
        {locations.map((location, index) => {
          const heading = getLocationHeading(location, index)
          const errors = showErrors ? locationFields[location.id] : undefined
          const canRemove = !requireAtLeastOne || locations.length > 1
          const sectionId = `physical-location-${location.id}`

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
                error={errors?.streetAddress}
              >
                <Input
                  id={`location-${location.id}-street`}
                  value={location.streetAddress}
                  onChange={(e) =>
                    update(location.id, { streetAddress: e.target.value })
                  }
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
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  id={`location-${location.id}-city`}
                  label="City"
                  required
                  error={errors?.city}
                >
                  <Input
                    id={`location-${location.id}-city`}
                    value={location.city}
                    onChange={(e) =>
                      update(location.id, { city: e.target.value })
                    }
                  />
                </Field>
                <Field
                  id={`location-${location.id}-province`}
                  label="Province"
                  required
                  error={errors?.province}
                >
                  <Input
                    id={`location-${location.id}-province`}
                    value={location.province}
                    onChange={(e) =>
                      update(location.id, { province: e.target.value })
                    }
                  />
                </Field>
              </div>

              <Field
                id={`location-${location.id}-postal`}
                label="Postal code"
                required
                error={errors?.postalCode}
              >
                <Input
                  id={`location-${location.id}-postal`}
                  value={location.postalCode}
                  onChange={(e) =>
                    update(location.id, { postalCode: e.target.value })
                  }
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
}
