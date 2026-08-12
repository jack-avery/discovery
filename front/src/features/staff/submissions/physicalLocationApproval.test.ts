import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ExistingResourceLocation } from '@/types/submission'
import { createEmptyLocation } from '@/features/submissions/existingResource/emptyState'
import {
  INCOMPLETE_EDITED_APPROVAL_HELPER,
  UNVERIFIED_LOCATION_APPROVAL_HELPER,
} from '@/features/staff/submissions/submissionApprovalGate'
import {
  accessModeNeedsPhysicalGeocoding,
  physicalLocationsSatisfyCoordinateInvariant,
  resolveStaffLocationApprovalGate,
} from '@/features/staff/submissions/physicalLocationApproval'

const COORDS_A = { lat: 45.4215, lng: -75.6972 }
const COORDS_B = { lat: 45.4112, lng: -75.6981 }

function location(
  street: string,
  coords: { lat: number; lng: number } | null,
  id = 'loc-1',
): ExistingResourceLocation {
  return createEmptyLocation({
    id,
    streetAddress: street,
    city: 'Ottawa',
    province: 'ON',
    postalCode: 'K1N 5T5',
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  })
}

/** Mirrors PhysicalLocationList.update: address edits clear lat/lng. */
function afterAddressEdit(
  loc: ExistingResourceLocation,
  streetAddress: string,
): ExistingResourceLocation {
  return {
    ...loc,
    lat: null,
    lng: null,
    streetAddress,
  }
}

describe('accessModeNeedsPhysicalGeocoding', () => {
  it('requires geocoding for physical and both only', () => {
    assert.equal(accessModeNeedsPhysicalGeocoding('physical'), true)
    assert.equal(accessModeNeedsPhysicalGeocoding('both'), true)
    assert.equal(accessModeNeedsPhysicalGeocoding('online'), false)
    assert.equal(accessModeNeedsPhysicalGeocoding(null), false)
  })
})

describe('physicalLocationsSatisfyCoordinateInvariant', () => {
  it('allows empty lists (field validation owns “at least one”)', () => {
    assert.equal(physicalLocationsSatisfyCoordinateInvariant([]), true)
  })

  it('requires coords on every complete address', () => {
    assert.equal(
      physicalLocationsSatisfyCoordinateInvariant([
        location('123 Street A', COORDS_A),
      ]),
      true,
    )
    assert.equal(
      physicalLocationsSatisfyCoordinateInvariant([
        location('123 Street A', null),
      ]),
      false,
    )
  })

  it('evaluates multiple locations independently', () => {
    assert.equal(
      physicalLocationsSatisfyCoordinateInvariant([
        location('123 Street A', COORDS_A, 'a'),
        location('456 Street B', COORDS_B, 'b'),
      ]),
      true,
    )
    assert.equal(
      physicalLocationsSatisfyCoordinateInvariant([
        location('123 Street A', COORDS_A, 'a'),
        location('456 Street B', null, 'b'),
      ]),
      false,
    )
  })
})

describe('resolveStaffLocationApprovalGate — New Resource scenarios', () => {
  it('1. unchanged verified physical location → approval valid', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: false,
      isComplete: true,
      accessMode: 'physical',
      locations: [location('123 Street A', COORDS_A)],
      locationsVerified: true,
    })
    assert.equal(gate.approveDisabled, false)
  })

  it('2. staff changes address after verification → approval invalid', () => {
    const prior = location('123 Street A', COORDS_A)
    const edited = afterAddressEdit(prior, '456 Street B')
    assert.equal(edited.lat, null)
    assert.equal(edited.lng, null)

    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [edited],
      locationsVerified: false,
    })
    assert.equal(gate.approveDisabled, true)
    assert.equal(gate.approveHelper, UNVERIFIED_LOCATION_APPROVAL_HELPER)
  })

  it('3. staff successfully verifies changed address → approval valid again', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [location('456 Street B', COORDS_B)],
      locationsVerified: true,
    })
    assert.equal(gate.approveDisabled, false)
  })

  it('4. new physical location without verification → approval invalid', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [location('789 New Ave', null)],
      locationsVerified: true,
    })
    assert.equal(gate.approveDisabled, true)
    assert.equal(gate.approveHelper, UNVERIFIED_LOCATION_APPROVAL_HELPER)
  })

  it('5. geocode failure (unverified) → approval invalid', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [location('999 Bad Rd', null)],
      locationsVerified: false,
    })
    assert.equal(gate.approveDisabled, true)
  })

  it('6. multiple physical locations, all verified → approval valid', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [
        location('123 Street A', COORDS_A, 'a'),
        location('456 Street B', COORDS_B, 'b'),
      ],
      locationsVerified: true,
    })
    assert.equal(gate.approveDisabled, false)
  })

  it('7. multiple physical locations, one unverified → approval invalid', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [
        location('123 Street A', COORDS_A, 'a'),
        location('456 Street B', null, 'b'),
      ],
      locationsVerified: false,
    })
    assert.equal(gate.approveDisabled, true)
  })

  it('8. remove the unverified location → approval valid', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [location('123 Street A', COORDS_A, 'a')],
      locationsVerified: true,
    })
    assert.equal(gate.approveDisabled, false)
  })
})

describe('resolveStaffLocationApprovalGate — Resource Update scenarios', () => {
  it('9. retain existing published verified location → valid without re-geocode', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [location('123 Street A', COORDS_A)],
      locationsVerified: true,
    })
    assert.equal(gate.approveDisabled, false)
  })

  it('10. accept valid verified proposed location → valid', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: false,
      isComplete: true,
      accessMode: 'physical',
      locations: [location('456 Street B', COORDS_B)],
      locationsVerified: true,
    })
    assert.equal(gate.approveDisabled, false)
  })

  it('11. staff changes final address → existing verification invalid', () => {
    const edited = afterAddressEdit(
      location('123 Street A', COORDS_A),
      '456 Street B',
    )
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [edited],
      locationsVerified: false,
    })
    assert.equal(gate.approveDisabled, true)
  })

  it('12. verify changed final address → approval valid', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [location('456 Street B', COORDS_B)],
      locationsVerified: true,
    })
    assert.equal(gate.approveDisabled, false)
  })

  it('13. reject address change and retain existing location → valid', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [location('123 Street A', COORDS_A)],
      locationsVerified: true,
    })
    assert.equal(gate.approveDisabled, false)
  })
})

describe('stale coordinate regression', () => {
  it('Address A + coordinates A → valid', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: false,
      isComplete: true,
      accessMode: 'physical',
      locations: [location('123 Street A', COORDS_A)],
      locationsVerified: true,
    })
    assert.equal(gate.approveDisabled, false)
  })

  it('change address to B → coordinates A must NOT satisfy approval', () => {
    const prior = location('123 Street A', COORDS_A)
    // Public/staff list clears coords on address edit — A’s coords cannot remain.
    const edited = afterAddressEdit(prior, '456 Street B')
    assert.notEqual(edited.streetAddress, prior.streetAddress)
    assert.equal(edited.lat, null)
    assert.equal(edited.lng, null)

    const afterClear = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [edited],
      locationsVerified: false,
    })
    assert.equal(afterClear.approveDisabled, true)

    // Even if stale coords were somehow retained, live verification must fail.
    const staleRetained = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'physical',
      locations: [
        createEmptyLocation({
          id: 'loc-1',
          streetAddress: '456 Street B',
          city: 'Ottawa',
          province: 'ON',
          postalCode: 'K1N 5T5',
          lat: COORDS_A.lat,
          lng: COORDS_A.lng,
        }),
      ],
      locationsVerified: false,
    })
    assert.equal(staleRetained.approveDisabled, true)
    assert.equal(
      staleRetained.approveHelper,
      UNVERIFIED_LOCATION_APPROVAL_HELPER,
    )
  })
})

describe('resolveStaffLocationApprovalGate — non-physical', () => {
  it('14. online-only resource is not blocked by geocoding', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: true,
      accessMode: 'online',
      locations: [],
      locationsVerified: false,
    })
    assert.equal(gate.approveDisabled, false)
  })

  it('prefers incomplete-field helper over geocode helper', () => {
    const gate = resolveStaffLocationApprovalGate({
      outcomeDiffersFromProposal: true,
      isComplete: false,
      accessMode: 'physical',
      locations: [location('123 Street A', null)],
      locationsVerified: false,
    })
    assert.equal(gate.approveDisabled, true)
    assert.equal(gate.approveHelper, INCOMPLETE_EDITED_APPROVAL_HELPER)
  })
})
