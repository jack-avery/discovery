import type { AccessMode, ExistingResourceLocation } from '@/types/submission'
import { isLocationAddressComplete } from '@/features/submissions/form/locationFieldValidation'
import {
  INCOMPLETE_EDITED_APPROVAL_HELPER,
  UNVERIFIED_LOCATION_APPROVAL_HELPER,
  type SubmissionApprovalGate,
} from '@/features/staff/submissions/submissionApprovalGate'

/** Access modes that publish mappable physical sites and require MapTiler coords. */
export function accessModeNeedsPhysicalGeocoding(
  accessMode: AccessMode | null | undefined,
): boolean {
  return accessMode === 'physical' || accessMode === 'both'
}

export function locationHasVerifiedCoordinates(
  location: ExistingResourceLocation,
): boolean {
  return (
    typeof location.lat === 'number' &&
    Number.isFinite(location.lat) &&
    typeof location.lng === 'number' &&
    Number.isFinite(location.lng)
  )
}

/**
 * Every complete physical address must carry finite lat/lng.
 * Matches public `canProceed` scope (incomplete rows are field-validation).
 */
export function physicalLocationsSatisfyCoordinateInvariant(
  locations: ExistingResourceLocation[],
): boolean {
  const complete = locations.filter(isLocationAddressComplete)
  if (complete.length === 0) return true
  return complete.every(locationHasVerifiedCoordinates)
}

export interface StaffLocationApprovalGateInput {
  /** True when the moderated outcome differs from the proposed submission. */
  outcomeDiffersFromProposal: boolean
  isComplete: boolean
  accessMode: AccessMode | null
  locations: ExistingResourceLocation[]
  /**
   * Live MapTiler readiness from `PhysicalLocationList` / geocoding hook.
   * True when physical geocoding is not required or all sites are verified.
   */
  locationsVerified: boolean
}

/**
 * Shared Approve gate for New Resource / Event / Update review.
 * Field completeness first; then physical geocode invariant.
 */
export function resolveStaffLocationApprovalGate(
  input: StaffLocationApprovalGateInput,
): SubmissionApprovalGate {
  if (input.outcomeDiffersFromProposal && !input.isComplete) {
    return {
      approveDisabled: true,
      approveHelper: INCOMPLETE_EDITED_APPROVAL_HELPER,
    }
  }

  const needsPhysical = accessModeNeedsPhysicalGeocoding(input.accessMode)
  if (!needsPhysical) {
    return { approveDisabled: false }
  }

  const coordinatesOk = physicalLocationsSatisfyCoordinateInvariant(
    input.locations,
  )
  if (!coordinatesOk || !input.locationsVerified) {
    return {
      approveDisabled: true,
      approveHelper: UNVERIFIED_LOCATION_APPROVAL_HELPER,
    }
  }

  return { approveDisabled: false }
}
