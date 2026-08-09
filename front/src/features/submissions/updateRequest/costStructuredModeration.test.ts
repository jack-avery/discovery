import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ExistingResourceData } from '@/types/submission'
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

function resource(
  partial: Partial<ExistingResourceData> = {},
): ExistingResourceData {
  const data = createEmptyExistingResourceData()
  data.name = 'Test Resource'
  data.description = 'A description'
  data.categoryIds = [1]
  data.accessMode = 'online'
  data.onlineUrl = 'https://example.org'
  data.locations = []
  data.contacts = [
    { id: 'c1', type: 'email', value: 'a@example.org', label: '' },
  ]
  data.costOption = 'paid'
  data.costDetails = '$20'
  return { ...data, ...partial }
}

function costField(
  baseline: ExistingResourceData,
  proposed: ExistingResourceData,
) {
  return buildResourceUpdateComparison(baseline, proposed)
    .sections.flatMap((section) => section.fields)
    .find((field) => field.id === 'cost:cost')
}

describe('Cost comparison changed flag', () => {
  it('is unchanged for identical structured cost', () => {
    const baseline = resource({ costOption: 'paid', costDetails: '$20' })
    const proposed = resource({ costOption: 'paid', costDetails: '$20' })
    const field = costField(baseline, proposed)
    assert.ok(field)
    assert.equal(field.changed, false)
  })

  it('is changed when meaningful details differ', () => {
    const baseline = resource({ costOption: 'paid', costDetails: '$20' })
    const proposed = resource({ costOption: 'paid', costDetails: '$25' })
    const field = costField(baseline, proposed)
    assert.ok(field)
    assert.equal(field.changed, true)
  })

  it('is unchanged for free with stale vs empty details', () => {
    const baseline = resource({ costOption: 'free', costDetails: '' })
    const proposed = resource({ costOption: 'free', costDetails: 'stale' })
    const field = costField(baseline, proposed)
    assert.ok(field)
    assert.equal(field.current, field.proposed)
    assert.equal(field.changed, false)
  })
})

describe('Cost structured moderation composition', () => {
  it('accept keeps proposed cost', () => {
    const baseline = resource({ costOption: 'paid', costDetails: '$20' })
    const proposed = resource({ costOption: 'free', costDetails: '' })
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'cost:cost': true },
      {},
      {},
    )
    assert.equal(composed.data.costOption, 'free')
    assert.equal(composed.data.costDetails, '')
  })

  it('reject restores baseline cost', () => {
    const baseline = resource({ costOption: 'paid', costDetails: '$20' })
    const proposed = resource({ costOption: 'free', costDetails: '' })
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'cost:cost': false },
      {},
      {},
    )
    assert.equal(composed.data.costOption, 'paid')
    assert.equal(composed.data.costDetails, '$20')
  })

  it('structured edit applies reviewer cost state', () => {
    const baseline = resource({ costOption: 'paid', costDetails: '$20' })
    const proposed = resource({ costOption: 'free', costDetails: '' })
    const working = createStructuredWorkingValues(proposed)
    working.cost = {
      costOption: 'sliding_scale',
      costDetails: '$10–$20',
    }
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'cost:cost': true },
      {},
      structuredEdits,
    )
    assert.equal(composed.data.costOption, 'sliding_scale')
    assert.equal(composed.data.costDetails, '$10–$20')
  })

  it('restoring proposed cost clears structured override', () => {
    const proposed = resource({ costOption: 'paid', costDetails: '$20' })
    const working = createStructuredWorkingValues(proposed)
    working.cost = { costOption: 'free', costDetails: '' }
    assert.equal(
      isStructuredWorkingFieldEdited('cost:cost', proposed, working),
      true,
    )
    working.cost = { costOption: 'paid', costDetails: '$20' }
    assert.equal(
      isStructuredWorkingFieldEdited('cost:cost', proposed, working),
      false,
    )
  })

  it('free with stale details is not a semantic override', () => {
    const proposed = resource({ costOption: 'free', costDetails: '' })
    const working = createStructuredWorkingValues(proposed)
    working.cost = { costOption: 'free', costDetails: 'hidden stale text' }
    assert.equal(
      isStructuredWorkingFieldEdited('cost:cost', proposed, working),
      false,
    )
    assert.equal(
      'cost:cost' in structuredEditsFromWorking(proposed, working),
      false,
    )
  })

  it('other without details fails completeness; valid details pass', () => {
    const incomplete = resource({ costOption: 'other', costDetails: '' })
    assert.equal(isExistingResourceComplete(incomplete), false)

    const complete = resource({
      costOption: 'other',
      costDetails: 'by donation',
    })
    assert.equal(isExistingResourceComplete(complete), true)
  })

  it('composes cost edit with structured locations edit', () => {
    const baseline = resource({
      accessMode: 'physical',
      onlineUrl: '',
      locations: [
        createEmptyLocation({
          streetAddress: '123 Main',
          lat: 1,
          lng: 2,
        }),
      ],
      costOption: 'paid',
      costDetails: '$20',
    })
    const proposed = structuredClone(baseline)
    proposed.costOption = 'free'
    proposed.costDetails = ''
    const working = createStructuredWorkingValues(proposed)
    working.cost = { costOption: 'donation', costDetails: 'suggested $5' }
    working.locations = [
      createEmptyLocation({
        streetAddress: '999 Reviewer',
        lat: 3,
        lng: 4,
      }),
    ]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'cost:cost': true, 'address:locations': true },
      {},
      structuredEdits,
    )
    assert.equal(composed.data.costOption, 'donation')
    assert.equal(composed.data.costDetails, 'suggested $5')
    assert.equal(composed.data.locations[0]?.streetAddress, '999 Reviewer')
  })

  it('composes cost edit with simple-string onlineUrl edit', () => {
    const baseline = resource({
      costOption: 'paid',
      costDetails: '$20',
      onlineUrl: 'https://old.example.org',
    })
    const proposed = resource({
      costOption: 'free',
      costDetails: '',
      onlineUrl: 'https://old.example.org',
    })
    const working = createStructuredWorkingValues(proposed)
    working.cost = { costOption: 'paid', costDetails: '$15' }
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'cost:cost': true, 'address:onlineUrl': true },
      { 'address:onlineUrl': 'https://new.example.org' },
      structuredEdits,
    )
    assert.equal(composed.data.costOption, 'paid')
    assert.equal(composed.data.costDetails, '$15')
    assert.equal(composed.data.onlineUrl, 'https://new.example.org')
  })

  it('does not treat cost as a legacy string field', () => {
    assert.equal(isResourceUpdateStructuredFieldId('cost:cost'), true)
    const baseline = resource({ costOption: 'paid', costDetails: '$20' })
    const proposed = resource({ costOption: 'free', costDetails: '' })
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'cost:cost': true },
      { 'cost:cost': 'Paid: $99' },
      {},
    )
    assert.equal(composed.data.costOption, 'free')
    assert.equal(composed.data.costDetails, '')
  })
})

describe('Cost form section regression', () => {
  it('treats free + stale details as unchanged', () => {
    const baseline = resource({ costOption: 'free', costDetails: '' })
    const current = structuredClone(baseline)
    current.costDetails = 'stale hidden'
    assert.equal(hasResourceDataChanges(baseline, current), false)
    assert.deepEqual(getEditedUpdateSections(baseline, current), [])
  })

  it('detects meaningful paid details changes', () => {
    const baseline = resource({ costOption: 'paid', costDetails: '$20' })
    const current = structuredClone(baseline)
    current.costDetails = '$25'
    assert.ok(getEditedUpdateSections(baseline, current).includes('cost'))
  })

  it('treats trimmed paid details restore as unchanged', () => {
    const baseline = resource({ costOption: 'paid', costDetails: '$20' })
    const current = structuredClone(baseline)
    current.costDetails = ' $20 '
    assert.equal(hasResourceDataChanges(baseline, current), false)
  })
})
