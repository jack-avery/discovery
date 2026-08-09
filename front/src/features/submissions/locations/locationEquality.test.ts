import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ExistingResourceLocation } from '@/types/submission'
import {
  createEmptyExistingResourceData,
  createEmptyLocation,
} from '@/features/submissions/existingResource/emptyState'
import { buildResourceUpdateComparison } from '@/features/submissions/updateRequest/buildResourceUpdateComparison'
import {
  getEditedUpdateSections,
  hasResourceDataChanges,
} from '@/features/submissions/updateRequest/updateSectionDiff'
import {
  areLocationsEquivalent,
  canonicalizeLocations,
} from './locationEquality'

function loc(
  partial: Partial<ExistingResourceLocation> & {
    streetAddress: string
  },
): ExistingResourceLocation {
  return createEmptyLocation(partial)
}

describe('canonicalizeLocations / areLocationsEquivalent', () => {
  it('treats exact same locations as equal', () => {
    const a = [
      loc({
        streetAddress: '123 Main St',
        city: 'Ottawa',
        lat: 45.4,
        lng: -75.7,
      }),
    ]
    assert.equal(areLocationsEquivalent(a, structuredClone(a)), true)
  })

  it('treats whitespace-only textual differences as equal', () => {
    assert.equal(
      areLocationsEquivalent(
        [
          loc({
            locationName: ' Main ',
            streetAddress: '123 Main St',
            unit: ' 2A ',
            city: ' Ottawa ',
            province: ' Ontario ',
            postalCode: ' K1A 0B1 ',
            lat: 45.4,
            lng: -75.7,
          }),
        ],
        [
          loc({
            locationName: 'Main',
            streetAddress: '123 Main St',
            unit: '2A',
            city: 'Ottawa',
            province: 'Ontario',
            postalCode: 'K1A 0B1',
            lat: 45.4,
            lng: -75.7,
          }),
        ],
      ),
      true,
    )
  })

  it('treats reordered locations as equal', () => {
    const first = loc({
      id: 'a',
      streetAddress: '111 A St',
      lat: 1,
      lng: 2,
    })
    const second = loc({
      id: 'b',
      streetAddress: '222 B St',
      lat: 3,
      lng: 4,
    })
    assert.equal(
      areLocationsEquivalent([first, second], [second, first]),
      true,
    )
    assert.deepEqual(
      canonicalizeLocations([second, first]).map((row) => row.streetAddress),
      ['111 A St', '222 B St'],
    )
  })

  it('detects a genuine address change', () => {
    assert.equal(
      areLocationsEquivalent(
        [loc({ streetAddress: '123 Main St', lat: 45.4, lng: -75.7 })],
        [loc({ streetAddress: '456 Other Ave', lat: 45.4, lng: -75.7 })],
      ),
      false,
    )
  })

  it('detects a coordinate-only change', () => {
    assert.equal(
      areLocationsEquivalent(
        [loc({ streetAddress: '123 Main St', lat: 45.4, lng: -75.7 })],
        [loc({ streetAddress: '123 Main St', lat: 45.5, lng: -75.7 })],
      ),
      false,
    )
  })

  it('treats real coordinates vs null as different', () => {
    assert.equal(
      areLocationsEquivalent(
        [loc({ streetAddress: '123 Main St', lat: 45.4, lng: -75.7 })],
        [loc({ streetAddress: '123 Main St', lat: null, lng: null })],
      ),
      false,
    )
  })

  it('ignores UI-only ids', () => {
    assert.equal(
      areLocationsEquivalent(
        [
          loc({
            id: 'ui-1',
            streetAddress: '123 Main St',
            lat: 45.4,
            lng: -75.7,
          }),
        ],
        [
          loc({
            id: 'ui-2',
            streetAddress: '123 Main St',
            lat: 45.4,
            lng: -75.7,
          }),
        ],
      ),
      true,
    )
  })

  it('detects add and remove', () => {
    const one = [loc({ streetAddress: '123 Main St', lat: 45.4, lng: -75.7 })]
    const two = [
      ...one,
      loc({ streetAddress: '456 Other Ave', lat: 45.5, lng: -75.6 }),
    ]
    assert.equal(areLocationsEquivalent(one, two), false)
    assert.equal(areLocationsEquivalent(two, one), false)
  })
})

describe('hasResourceDataChanges location regression', () => {
  function baselineWithLocation(
    location: ExistingResourceLocation,
  ): ReturnType<typeof createEmptyExistingResourceData> {
    const baseline = createEmptyExistingResourceData()
    baseline.name = 'Test Resource'
    baseline.description = 'A description'
    baseline.categoryIds = [1]
    baseline.accessMode = 'physical'
    baseline.locations = [location]
    baseline.onlineUrl = ''
    return baseline
  }

  it('marks restore-address-with-null-coords as a change', () => {
    const baseline = baselineWithLocation(
      loc({ streetAddress: '123 Main St', lat: 45.4, lng: -75.7 }),
    )
    const current = structuredClone(baseline)
    // Address restored after edit; geocode coords still cleared.
    current.locations = [
      loc({ streetAddress: '123 Main St', lat: null, lng: null }),
    ]

    assert.equal(hasResourceDataChanges(baseline, current), true)
    assert.ok(getEditedUpdateSections(baseline, current).includes('address'))
  })

  it('treats restore with identical coords as unchanged', () => {
    const baseline = baselineWithLocation(
      loc({ streetAddress: '123 Main St', lat: 45.4, lng: -75.7 }),
    )
    const current = structuredClone(baseline)
    current.locations = [
      loc({
        id: 'new-id',
        streetAddress: '123 Main St',
        lat: 45.4,
        lng: -75.7,
      }),
    ]

    assert.equal(hasResourceDataChanges(baseline, current), false)
    assert.deepEqual(getEditedUpdateSections(baseline, current), [])
  })

  it('still marks address section when only accessMode changes', () => {
    const baseline = baselineWithLocation(
      loc({ streetAddress: '123 Main St', lat: 45.4, lng: -75.7 }),
    )
    const current = structuredClone(baseline)
    current.accessMode = 'both'
    current.onlineUrl = 'https://example.org'

    assert.ok(getEditedUpdateSections(baseline, current).includes('address'))
  })

  it('still marks address section when only onlineUrl changes', () => {
    const baseline = baselineWithLocation(
      loc({ streetAddress: '123 Main St', lat: 45.4, lng: -75.7 }),
    )
    baseline.accessMode = 'both'
    baseline.onlineUrl = 'https://old.example.org'
    const current = structuredClone(baseline)
    current.onlineUrl = 'https://new.example.org'

    assert.deepEqual(getEditedUpdateSections(baseline, current), ['address'])
  })
})

describe('buildResourceUpdateComparison location changed flag', () => {
  it('marks locations changed when address text matches but coordinates differ', () => {
    const baseline = createEmptyExistingResourceData()
    baseline.locations = [
      loc({ streetAddress: '123 Main St', lat: 45.4, lng: -75.7 }),
    ]
    const proposed = structuredClone(baseline)
    proposed.locations = [
      loc({ streetAddress: '123 Main St', lat: null, lng: null }),
    ]

    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const locationsField = comparison.sections
      .flatMap((section) => section.fields)
      .find((field) => field.id === 'address:locations')

    assert.ok(locationsField)
    assert.equal(locationsField.current, locationsField.proposed)
    assert.equal(locationsField.changed, true)
  })
})
