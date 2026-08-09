import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { AccessMode, ExistingResourceData } from '@/types/submission'
import {
  createEmptyExistingResourceData,
  createEmptyLocation,
} from '@/features/submissions/existingResource/emptyState'
import { isExistingResourceComplete } from '@/features/submissions/existingResource/validation'
import { buildResourceUpdateComparison } from '@/features/submissions/updateRequest/buildResourceUpdateComparison'
import { composeResourceUpdateFinalVersion } from '@/features/submissions/updateRequest/composeResourceUpdateFinalVersion'
import {
  createStructuredWorkingValues,
  isResourceUpdateStructuredFieldId,
  isStructuredWorkingFieldEdited,
  structuredEditsFromWorking,
} from '@/features/submissions/updateRequest/resourceUpdateStructuredFields'
import {
  getEditedUpdateSections,
  hasResourceDataChanges,
} from '@/features/submissions/updateRequest/updateSectionDiff'
import { ACCESS_MODE_LABELS } from '@/features/submissions/mappers/labels'

/** Same gate UpdateReviewStructuredEditors uses for Locations requireAtLeastOne. */
function locationsRequireAtLeastOne(accessMode: AccessMode | null): boolean {
  return accessMode === 'physical' || accessMode === 'both'
}

function resource(partial: Partial<ExistingResourceData>): ExistingResourceData {
  const data = createEmptyExistingResourceData()
  data.name = 'Test Resource'
  data.description = 'A description'
  data.categoryIds = [1]
  data.accessMode = 'physical'
  data.locations = [
    createEmptyLocation({
      streetAddress: '123 Main St',
      lat: 45.4,
      lng: -75.7,
    }),
  ]
  data.onlineUrl = ''
  data.contacts = [
    {
      id: 'c1',
      type: 'email',
      value: 'a@example.org',
      label: '',
    },
  ]
  return { ...data, ...partial }
}

function accessModeField(
  baseline: ExistingResourceData,
  proposed: ExistingResourceData,
) {
  const comparison = buildResourceUpdateComparison(baseline, proposed)
  return comparison.sections
    .flatMap((section) => section.fields)
    .find((field) => field.id === 'address:accessMode')
}

describe('Access Mode comparison changed flag', () => {
  it('is unchanged when enums match', () => {
    const baseline = resource({ accessMode: 'physical' })
    const proposed = resource({ accessMode: 'physical' })
    const field = accessModeField(baseline, proposed)
    assert.ok(field)
    assert.equal(field.changed, false)
    assert.equal(field.current, ACCESS_MODE_LABELS.physical)
    assert.equal(field.proposed, ACCESS_MODE_LABELS.physical)
  })

  it('is changed when enums differ', () => {
    const baseline = resource({ accessMode: 'physical' })
    const proposed = resource({ accessMode: 'online', onlineUrl: 'https://ex.org' })
    const field = accessModeField(baseline, proposed)
    assert.ok(field)
    assert.equal(field.changed, true)
  })

  it('does not derive equality from display labels alone', () => {
    // Labels happen to match enums 1:1; changed must still track model values.
    const baseline = resource({ accessMode: 'physical' })
    const proposed = resource({ accessMode: 'both', onlineUrl: 'https://ex.org' })
    const field = accessModeField(baseline, proposed)
    assert.ok(field)
    assert.equal(
      ACCESS_MODE_LABELS.physical !== ACCESS_MODE_LABELS.both,
      true,
    )
    assert.equal(baseline.accessMode !== proposed.accessMode, true)
    assert.equal(field.changed, true)
  })
})

describe('Access Mode structured edits + composition', () => {
  it('accept keeps proposed accessMode', () => {
    const baseline = resource({ accessMode: 'physical' })
    const proposed = resource({
      accessMode: 'online',
      onlineUrl: 'https://example.org',
      locations: [],
    })
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'address:accessMode': true },
      {},
      {},
    )
    assert.equal(composed.data.accessMode, 'online')
  })

  it('reject restores baseline accessMode', () => {
    const baseline = resource({ accessMode: 'physical' })
    const proposed = resource({
      accessMode: 'online',
      onlineUrl: 'https://example.org',
      locations: [],
    })
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'address:accessMode': false },
      {},
      {},
    )
    assert.equal(composed.data.accessMode, 'physical')
  })

  it('structured edit applies reviewer-selected enum', () => {
    const baseline = resource({ accessMode: 'physical' })
    const proposed = resource({
      accessMode: 'online',
      onlineUrl: 'https://example.org',
    })
    const working = createStructuredWorkingValues(proposed)
    working.accessMode = 'both'
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    assert.deepEqual(structuredEdits['address:accessMode'], 'both')

    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'address:accessMode': true },
      {},
      structuredEdits,
    )
    assert.equal(composed.data.accessMode, 'both')
    assert.equal(composed.differsFromProposed, true)
  })

  it('restoring working value to proposed clears structured override', () => {
    const proposed = resource({ accessMode: 'online', onlineUrl: 'https://ex.org' })
    const working = createStructuredWorkingValues(proposed)
    working.accessMode = 'both'
    assert.equal(
      isStructuredWorkingFieldEdited('address:accessMode', proposed, working),
      true,
    )
    working.accessMode = 'online'
    assert.equal(
      isStructuredWorkingFieldEdited('address:accessMode', proposed, working),
      false,
    )
    assert.equal(
      'address:accessMode' in structuredEditsFromWorking(proposed, working),
      false,
    )
  })

  it('composes accessMode + locations structured edits together', () => {
    const baseline = resource({ accessMode: 'physical' })
    const proposed = resource({
      accessMode: 'online',
      onlineUrl: 'https://example.org',
      locations: [],
    })
    const working = createStructuredWorkingValues(proposed)
    working.accessMode = 'physical'
    working.locations = [
      createEmptyLocation({
        streetAddress: '999 Reviewer St',
        lat: 45.1,
        lng: -75.1,
      }),
    ]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'address:accessMode': true, 'address:locations': true },
      {},
      structuredEdits,
    )
    assert.equal(composed.data.accessMode, 'physical')
    assert.equal(composed.data.locations[0]?.streetAddress, '999 Reviewer St')
  })

  it('composes accessMode structured edit + onlineUrl simple-string edit', () => {
    const baseline = resource({ accessMode: 'physical' })
    const proposed = resource({
      accessMode: 'online',
      onlineUrl: 'https://old.example.org',
      locations: [],
    })
    const working = createStructuredWorkingValues(proposed)
    working.accessMode = 'both'
    working.locations = [
      createEmptyLocation({
        streetAddress: '123 Main St',
        lat: 45.4,
        lng: -75.7,
      }),
    ]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      {
        'address:accessMode': true,
        'address:onlineUrl': true,
        'address:locations': true,
      },
      { 'address:onlineUrl': 'https://new.example.org' },
      structuredEdits,
    )
    assert.equal(composed.data.accessMode, 'both')
    assert.equal(composed.data.onlineUrl, 'https://new.example.org')
  })

  it('does not treat accessMode as a legacy string edit field', () => {
    assert.equal(isResourceUpdateStructuredFieldId('address:accessMode'), true)
    const baseline = resource({ accessMode: 'physical' })
    const proposed = resource({
      accessMode: 'online',
      onlineUrl: 'https://example.org',
      locations: [],
    })
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    // Legacy string path must not mutate accessMode.
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'address:accessMode': true },
      { 'address:accessMode': 'Both' },
      {},
    )
    assert.equal(composed.data.accessMode, 'online')
  })
})

describe('Access Mode form Address section', () => {
  it('marks Address edited when only accessMode changes', () => {
    const baseline = resource({ accessMode: 'physical' })
    const current = structuredClone(baseline)
    current.accessMode = 'online'
    current.onlineUrl = 'https://example.org'
    assert.ok(getEditedUpdateSections(baseline, current).includes('address'))
  })

  it('clears Access Mode contribution when restored to baseline', () => {
    const baseline = resource({ accessMode: 'physical' })
    const current = structuredClone(baseline)
    current.accessMode = 'online'
    current.onlineUrl = 'https://example.org'
    assert.equal(hasResourceDataChanges(baseline, current), true)
    current.accessMode = 'physical'
    current.onlineUrl = ''
    assert.equal(hasResourceDataChanges(baseline, current), false)
  })
})

describe('Access Mode location requirement coupling', () => {
  it('requireAtLeastOne follows working accessMode, not proposed', () => {
    const proposed = resource({
      accessMode: 'online',
      onlineUrl: 'https://example.org',
      locations: [],
    })
    const working = createStructuredWorkingValues(proposed)
    assert.equal(locationsRequireAtLeastOne(proposed.accessMode), false)
    assert.equal(locationsRequireAtLeastOne(working.accessMode), false)

    working.accessMode = 'physical'
    assert.equal(locationsRequireAtLeastOne(working.accessMode), true)

    working.accessMode = 'online'
    assert.equal(locationsRequireAtLeastOne(working.accessMode), false)
  })
})

describe('Access Mode completeness gate', () => {
  it('blocks incomplete physical + empty locations compositions', () => {
    const data = resource({
      accessMode: 'physical',
      locations: [],
      onlineUrl: '',
    })
    assert.equal(isExistingResourceComplete(data), false)
  })

  it('blocks incomplete online + blank onlineUrl compositions', () => {
    const data = resource({
      accessMode: 'online',
      locations: [],
      onlineUrl: '',
    })
    assert.equal(isExistingResourceComplete(data), false)
  })
})
