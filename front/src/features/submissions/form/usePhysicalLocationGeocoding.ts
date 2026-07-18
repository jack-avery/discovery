import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ExistingResourceLocation } from '@/types/submission'
import {
  ADDRESS_NOT_VERIFIED_MESSAGE,
  ADDRESS_VERIFICATION_UNAVAILABLE_MESSAGE,
  verifyPhysicalAddressWithMapTiler,
  type VerifiedCoordinates,
} from '@/services/maptilerGeocodingService'
import {
  isLocationAddressComplete,
  locationGeocodingCacheKey,
} from './locationFieldValidation'

export type LocationGeocodingStatus =
  | 'idle'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'error'

export interface LocationGeocodingState {
  status: LocationGeocodingStatus
  message?: string
  /** Address fingerprint when last validated. */
  validatedKey?: string
  /** MapTiler center when status is valid. */
  coordinates?: VerifiedCoordinates
}

export interface EnsureValidatedOptions {
  /** After a failed leave/save attempt, focus the first invalid address field. */
  focusOnFailure?: boolean
}

export interface PhysicalLocationGeocodingHandle {
  canProceed: () => boolean
  ensureValidated: (options?: EnsureValidatedOptions) => Promise<boolean>
  focusFirstInvalidField: () => void
}

interface UsePhysicalLocationGeocodingOptions {
  locations: ExistingResourceLocation[]
  showErrors: boolean
  /** Fired whenever verification readiness changes (for progressive unlock). */
  onVerifiedChange?: (verified: boolean) => void
  /**
   * Persist or clear MapTiler coordinates on the location model so submission
   * mapping can include lat/lng without a second geocode.
   */
  onCoordinatesChange?: (
    locationId: string,
    coordinates: VerifiedCoordinates | null,
  ) => void
}

const COMPLETE_ADDRESS_DEBOUNCE_MS = 400

function hasMatchingCoordinates(
  location: ExistingResourceLocation,
  coordinates: VerifiedCoordinates,
): boolean {
  return location.lat === coordinates.lat && location.lng === coordinates.lng
}

export function usePhysicalLocationGeocoding({
  locations,
  showErrors,
  onVerifiedChange,
  onCoordinatesChange,
}: UsePhysicalLocationGeocodingOptions) {
  const [states, setStates] = useState<Record<string, LocationGeocodingState>>(
    {},
  )
  const successCacheRef = useRef<Map<string, VerifiedCoordinates>>(new Map())
  const inFlightRef = useRef<
    Map<string, { key: string; promise: Promise<LocationGeocodingState> }>
  >(new Map())
  const abortRef = useRef<Map<string, AbortController>>(new Map())
  const statesRef = useRef(states)
  const locationsRef = useRef(locations)
  const prevShowErrorsRef = useRef(showErrors)
  const onVerifiedChangeRef = useRef(onVerifiedChange)
  const onCoordinatesChangeRef = useRef(onCoordinatesChange)

  statesRef.current = states
  locationsRef.current = locations
  onVerifiedChangeRef.current = onVerifiedChange
  onCoordinatesChangeRef.current = onCoordinatesChange

  const setLocationState = useCallback(
    (locationId: string, next: LocationGeocodingState) => {
      setStates((current) => ({ ...current, [locationId]: next }))
    },
    [],
  )

  const applyCoordinates = useCallback(
    (locationId: string, coordinates: VerifiedCoordinates | null) => {
      const location = locationsRef.current.find((loc) => loc.id === locationId)
      if (!location) return

      if (coordinates) {
        if (hasMatchingCoordinates(location, coordinates)) return
        onCoordinatesChangeRef.current?.(locationId, coordinates)
        return
      }

      if (location.lat == null && location.lng == null) return
      onCoordinatesChangeRef.current?.(locationId, null)
    },
    [],
  )

  useEffect(() => {
    for (const location of locations) {
      const key = locationGeocodingCacheKey(location)
      const state = statesRef.current[location.id]
      if (state?.validatedKey && state.validatedKey !== key) {
        successCacheRef.current.delete(state.validatedKey)
        // Address fingerprint changed — drop stale MapTiler coords.
        if (location.lat != null || location.lng != null) {
          onCoordinatesChangeRef.current?.(location.id, null)
        }
      }
    }

    setStates((current) => {
      let changed = false
      const next = { ...current }

      for (const location of locations) {
        const key = locationGeocodingCacheKey(location)
        const state = next[location.id]
        if (state?.validatedKey && state.validatedKey !== key) {
          delete next[location.id]
          changed = true
        }
      }

      const locationIds = new Set(locations.map((loc) => loc.id))
      for (const id of Object.keys(next)) {
        if (!locationIds.has(id)) {
          delete next[id]
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [locations])

  useEffect(() => {
    return () => {
      for (const controller of abortRef.current.values()) {
        controller.abort()
      }
      abortRef.current.clear()
      inFlightRef.current.clear()
    }
  }, [])

  const focusFirstInvalidField = useCallback(() => {
    const currentLocations = locationsRef.current
    const currentStates = statesRef.current

    for (const location of currentLocations) {
      if (!isLocationAddressComplete(location)) continue

      const key = locationGeocodingCacheKey(location)
      const state = currentStates[location.id]
      const isVerified =
        state?.status === 'valid' &&
        state.validatedKey === key &&
        successCacheRef.current.has(key)

      if (isVerified) continue

      const field = document.getElementById(`location-${location.id}-street`)
      if (!(field instanceof HTMLElement)) continue

      field.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field.focus({ preventScroll: true })
      return
    }
  }, [])

  const validateLocation = useCallback(
    (location: ExistingResourceLocation): Promise<LocationGeocodingState> => {
      if (!isLocationAddressComplete(location)) {
        return Promise.resolve({ status: 'idle' })
      }

      const key = locationGeocodingCacheKey(location)

      // Reuse coordinates already persisted on the location (e.g. draft restore)
      // without issuing another MapTiler request.
      if (
        typeof location.lat === 'number' &&
        Number.isFinite(location.lat) &&
        typeof location.lng === 'number' &&
        Number.isFinite(location.lng)
      ) {
        const coordinates = { lat: location.lat, lng: location.lng }
        successCacheRef.current.set(key, coordinates)
        const next: LocationGeocodingState = {
          status: 'valid',
          validatedKey: key,
          coordinates,
        }
        setLocationState(location.id, next)
        return Promise.resolve(next)
      }

      const cached = successCacheRef.current.get(key)
      if (cached) {
        const next: LocationGeocodingState = {
          status: 'valid',
          validatedKey: key,
          coordinates: cached,
        }
        setLocationState(location.id, next)
        applyCoordinates(location.id, cached)
        return Promise.resolve(next)
      }

      const existingState = statesRef.current[location.id]
      // Keep a settled not-found result for this fingerprint; revalidation
      // would briefly clear the inline error (status → validating).
      if (
        existingState?.validatedKey === key &&
        existingState.status === 'invalid'
      ) {
        return Promise.resolve(existingState)
      }

      const inFlight = inFlightRef.current.get(location.id)
      if (inFlight && inFlight.key === key) {
        return inFlight.promise
      }

      abortRef.current.get(location.id)?.abort()

      const controller = new AbortController()
      abortRef.current.set(location.id, controller)

      setLocationState(location.id, {
        status: 'validating',
        validatedKey: key,
        // Preserve prior message while retrying network failures.
        message:
          existingState?.validatedKey === key
            ? existingState.message
            : undefined,
      })

      let settle!: (result: LocationGeocodingState) => void
      const promise = new Promise<LocationGeocodingState>((resolve) => {
        settle = resolve
      })
      inFlightRef.current.set(location.id, { key, promise })

      void (async () => {
        try {
          const result = await verifyPhysicalAddressWithMapTiler(
            {
              streetAddress: location.streetAddress,
              unit: location.unit,
              city: location.city,
              province: location.province,
              postalCode: location.postalCode,
            },
            { signal: controller.signal },
          )

          if (controller.signal.aborted) {
            settle(statesRef.current[location.id] ?? { status: 'idle' })
            return
          }

          if (result.outcome === 'valid') {
            const coordinates = { lat: result.lat, lng: result.lng }
            successCacheRef.current.set(key, coordinates)
            const next: LocationGeocodingState = {
              status: 'valid',
              validatedKey: key,
              coordinates,
            }
            setLocationState(location.id, next)
            applyCoordinates(location.id, coordinates)
            settle(next)
            return
          }

          if (result.outcome === 'not_found') {
            applyCoordinates(location.id, null)
            const next: LocationGeocodingState = {
              status: 'invalid',
              message: ADDRESS_NOT_VERIFIED_MESSAGE,
              validatedKey: key,
            }
            setLocationState(location.id, next)
            settle(next)
            return
          }

          applyCoordinates(location.id, null)
          const next: LocationGeocodingState = {
            status: 'error',
            message: ADDRESS_VERIFICATION_UNAVAILABLE_MESSAGE,
            validatedKey: key,
          }
          setLocationState(location.id, next)
          settle(next)
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            settle(statesRef.current[location.id] ?? { status: 'idle' })
            return
          }
          applyCoordinates(location.id, null)
          const next: LocationGeocodingState = {
            status: 'error',
            message: ADDRESS_VERIFICATION_UNAVAILABLE_MESSAGE,
            validatedKey: key,
          }
          setLocationState(location.id, next)
          settle(next)
        } finally {
          const current = inFlightRef.current.get(location.id)
          if (current?.promise === promise) {
            inFlightRef.current.delete(location.id)
          }
          if (abortRef.current.get(location.id) === controller) {
            abortRef.current.delete(location.id)
          }
        }
      })()

      return promise
    },
    [setLocationState, applyCoordinates],
  )

  const validateOnBlur = useCallback(
    (location: ExistingResourceLocation) => {
      if (!isLocationAddressComplete(location)) return
      void validateLocation(location)
    },
    [validateLocation],
  )

  const ensureValidated = useCallback(
    async (options?: EnsureValidatedOptions): Promise<boolean> => {
      const complete = locations.filter(isLocationAddressComplete)
      if (complete.length === 0) return true

      const results = await Promise.all(
        complete.map((loc) => validateLocation(loc)),
      )
      const ok = results.every(
        (state) =>
          state.status === 'valid' &&
          state.coordinates != null &&
          Number.isFinite(state.coordinates.lat) &&
          Number.isFinite(state.coordinates.lng),
      )

      if (!ok && options?.focusOnFailure) {
        // Wait a tick so invalid messages are painted before focus/scroll.
        window.setTimeout(() => {
          focusFirstInvalidField()
        }, 0)
      }

      return ok
    },
    [locations, validateLocation, focusFirstInvalidField],
  )

  const canProceed = useCallback((): boolean => {
    const complete = locations.filter(isLocationAddressComplete)
    if (complete.length === 0) return true

    return complete.every((location) => {
      const key = locationGeocodingCacheKey(location)
      const state = states[location.id]
      const cached = successCacheRef.current.get(key)
      return (
        state?.status === 'valid' &&
        state.validatedKey === key &&
        cached != null &&
        typeof location.lat === 'number' &&
        typeof location.lng === 'number'
      )
    })
  }, [locations, states])

  /** Reactive readiness for progressive disclosure (no complete-unverified addresses). */
  const isVerified = useMemo(() => {
    const complete = locations.filter(isLocationAddressComplete)
    if (complete.length === 0) return true

    return complete.every((location) => {
      const key = locationGeocodingCacheKey(location)
      const state = states[location.id]
      const cached = successCacheRef.current.get(key)
      return (
        state?.status === 'valid' &&
        state.validatedKey === key &&
        cached != null &&
        typeof location.lat === 'number' &&
        typeof location.lng === 'number'
      )
    })
  }, [locations, states])

  useEffect(() => {
    onVerifiedChangeRef.current?.(isVerified)
  }, [isVerified])

  // After the address becomes complete and settles, validate without waiting for Save.
  // Debounced so we do not call MapTiler on every keystroke while all fields are filled.
  useEffect(() => {
    const complete = locations.filter(isLocationAddressComplete)
    if (complete.length === 0) return

    const needsValidation = complete.some((location) => {
      const key = locationGeocodingCacheKey(location)
      if (successCacheRef.current.has(key) && location.lat != null && location.lng != null) {
        return false
      }
      const state = statesRef.current[location.id]
      if (!state || state.validatedKey !== key) return true
      if (state.status === 'validating') return false
      if (state.status === 'invalid' || state.status === 'valid') return false
      // Network errors may be retried after the address settles again.
      return state.status === 'error' || state.status === 'idle'
    })

    if (!needsValidation) return

    const timer = window.setTimeout(() => {
      void ensureValidated()
    }, COMPLETE_ADDRESS_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [locations, ensureValidated])

  useEffect(() => {
    const justEnabled = showErrors && !prevShowErrorsRef.current
    prevShowErrorsRef.current = showErrors
    if (!justEnabled) return
    void ensureValidated({ focusOnFailure: true })
  }, [showErrors, ensureValidated])

  const getGeocodingError = useCallback(
    (location: ExistingResourceLocation): string | undefined => {
      if (!isLocationAddressComplete(location)) return undefined

      const key = locationGeocodingCacheKey(location)
      const state = states[location.id]
      if (!state || state.validatedKey !== key) return undefined

      // Surface failures as soon as MapTiler settles — no blur/save required.
      if (state.status === 'invalid' || state.status === 'error') {
        return state.message
      }

      // Keep a prior failure visible if a network retry is in flight.
      if (state.status === 'validating' && state.message) {
        return state.message
      }

      return undefined
    },
    [states],
  )

  return {
    states,
    isVerified,
    validateOnBlur,
    ensureValidated,
    canProceed,
    getGeocodingError,
    focusFirstInvalidField,
  }
}
