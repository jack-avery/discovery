import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ExistingResourceLocation } from '@/types/submission'
import {
  ADDRESS_NOT_VERIFIED_MESSAGE,
  ADDRESS_VERIFICATION_UNAVAILABLE_MESSAGE,
  verifyPhysicalAddressWithMapTiler,
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
}

const COMPLETE_ADDRESS_DEBOUNCE_MS = 400

export function usePhysicalLocationGeocoding({
  locations,
  showErrors,
  onVerifiedChange,
}: UsePhysicalLocationGeocodingOptions) {
  const [states, setStates] = useState<Record<string, LocationGeocodingState>>(
    {},
  )
  const successCacheRef = useRef<Map<string, true>>(new Map())
  const inFlightRef = useRef<
    Map<string, { key: string; promise: Promise<LocationGeocodingState> }>
  >(new Map())
  const abortRef = useRef<Map<string, AbortController>>(new Map())
  const statesRef = useRef(states)
  const locationsRef = useRef(locations)
  const prevShowErrorsRef = useRef(showErrors)
  const onVerifiedChangeRef = useRef(onVerifiedChange)

  statesRef.current = states
  locationsRef.current = locations
  onVerifiedChangeRef.current = onVerifiedChange

  const setLocationState = useCallback(
    (locationId: string, next: LocationGeocodingState) => {
      setStates((current) => ({ ...current, [locationId]: next }))
    },
    [],
  )

  useEffect(() => {
    setStates((current) => {
      let changed = false
      const next = { ...current }

      for (const location of locations) {
        const key = locationGeocodingCacheKey(location)
        const state = next[location.id]
        if (state?.validatedKey && state.validatedKey !== key) {
          successCacheRef.current.delete(state.validatedKey)
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
      if (successCacheRef.current.has(key)) {
        const next: LocationGeocodingState = {
          status: 'valid',
          validatedKey: key,
        }
        setLocationState(location.id, next)
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
          const outcome = await verifyPhysicalAddressWithMapTiler(
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

          if (outcome === 'valid') {
            successCacheRef.current.set(key, true)
            const next: LocationGeocodingState = {
              status: 'valid',
              validatedKey: key,
            }
            setLocationState(location.id, next)
            settle(next)
            return
          }

          if (outcome === 'not_found') {
            const next: LocationGeocodingState = {
              status: 'invalid',
              message: ADDRESS_NOT_VERIFIED_MESSAGE,
              validatedKey: key,
            }
            setLocationState(location.id, next)
            settle(next)
            return
          }

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
    [setLocationState],
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
      const ok = results.every((state) => state.status === 'valid')

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
      return (
        state?.status === 'valid' &&
        state.validatedKey === key &&
        successCacheRef.current.has(key)
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
      return (
        state?.status === 'valid' &&
        state.validatedKey === key &&
        successCacheRef.current.has(key)
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
      if (successCacheRef.current.has(key)) return false
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
