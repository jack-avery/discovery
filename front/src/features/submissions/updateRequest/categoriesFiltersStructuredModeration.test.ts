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
import { mergeLookupOptionsWithSelectedIds } from '@/features/staff/submissions/updateReview/mergeLookupOptionsWithSelectedIds'

function resource(
  partial: Partial<ExistingResourceData> = {},
): ExistingResourceData {
  const data = createEmptyExistingResourceData()
  data.name = 'Test Resource'
  data.description = 'A description'
  data.categoryIds = [1]
  data.filterIds = []
  data.accessMode = 'online'
  data.onlineUrl = 'https://example.org'
  data.locations = []
  data.contacts = [
    { id: 'c1', type: 'email', value: 'a@example.org', label: '' },
  ]
  return { ...data, ...partial }
}

function fieldById(
  baseline: ExistingResourceData,
  proposed: ExistingResourceData,
  fieldId: string,
) {
  return buildResourceUpdateComparison(baseline, proposed)
    .sections.flatMap((section) => section.fields)
    .find((field) => field.id === fieldId)
}

describe('Categories / Filters comparison changed flag', () => {
  it('is unchanged for same category ids in different order', () => {
    const baseline = resource({ categoryIds: [1, 2, 3] })
    const proposed = resource({ categoryIds: [3, 1, 2] })
    const field = fieldById(baseline, proposed, 'categories:categories')
    assert.ok(field)
    assert.equal(field.changed, false)
  })

  it('is unchanged for same filter ids in different order', () => {
    const baseline = resource({ filterIds: [10, 20] })
    const proposed = resource({ filterIds: [20, 10] })
    const field = fieldById(baseline, proposed, 'categories:filters')
    assert.ok(field)
    assert.equal(field.changed, false)
  })

  it('is changed for real category id differences', () => {
    const baseline = resource({ categoryIds: [1, 2] })
    const proposed = resource({ categoryIds: [1, 3] })
    const field = fieldById(baseline, proposed, 'categories:categories')
    assert.ok(field)
    assert.equal(field.changed, true)
  })

  it('is changed for real filter id differences', () => {
    const baseline = resource({ filterIds: [10] })
    const proposed = resource({ filterIds: [10, 11] })
    const field = fieldById(baseline, proposed, 'categories:filters')
    assert.ok(field)
    assert.equal(field.changed, true)
  })
})

describe('Categories structured moderation composition', () => {
  it('accept keeps proposed category ids', () => {
    const baseline = resource({ categoryIds: [1, 2] })
    const proposed = resource({ categoryIds: [1, 3] })
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'categories:categories': true },
      {},
      {},
    )
    assert.deepEqual(composed.data.categoryIds, [1, 3])
  })

  it('reject restores baseline category ids', () => {
    const baseline = resource({ categoryIds: [1, 2] })
    const proposed = resource({ categoryIds: [1, 3] })
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'categories:categories': false },
      {},
      {},
    )
    assert.deepEqual(composed.data.categoryIds, [1, 2])
  })

  it('structured edit applies reviewer category ids', () => {
    const baseline = resource({ categoryIds: [1, 2] })
    const proposed = resource({ categoryIds: [1, 3] })
    const working = createStructuredWorkingValues(proposed)
    working.categoryIds = [1, 4]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    assert.deepEqual(structuredEdits['categories:categories'], [1, 4])

    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'categories:categories': true },
      {},
      structuredEdits,
    )
    assert.deepEqual(composed.data.categoryIds, [1, 4])
  })

  it('reorder-only working state is not a structured override', () => {
    const proposed = resource({ categoryIds: [1, 2, 3] })
    const working = createStructuredWorkingValues(proposed)
    working.categoryIds = [3, 1, 2]
    assert.equal(
      isStructuredWorkingFieldEdited(
        'categories:categories',
        proposed,
        working,
      ),
      false,
    )
    assert.equal(
      'categories:categories' in structuredEditsFromWorking(proposed, working),
      false,
    )
  })

  it('restoring proposed set clears category override', () => {
    const proposed = resource({ categoryIds: [1, 3] })
    const working = createStructuredWorkingValues(proposed)
    working.categoryIds = [1, 4]
    assert.equal(
      isStructuredWorkingFieldEdited(
        'categories:categories',
        proposed,
        working,
      ),
      true,
    )
    working.categoryIds = [3, 1]
    assert.equal(
      isStructuredWorkingFieldEdited(
        'categories:categories',
        proposed,
        working,
      ),
      false,
    )
  })

  it('empty categories compose but fail completeness', () => {
    const baseline = resource({ categoryIds: [1] })
    const proposed = resource({ categoryIds: [1, 2] })
    const working = createStructuredWorkingValues(proposed)
    working.categoryIds = []
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'categories:categories': true },
      {},
      structuredEdits,
    )
    assert.deepEqual(composed.data.categoryIds, [])
    assert.equal(isExistingResourceComplete(composed.data), false)
  })

  it('preserves unknown historical category ids through reject and edit', () => {
    const baseline = resource({ categoryIds: [1, 999] })
    const proposed = resource({ categoryIds: [1, 999, 2] })
    const comparison = buildResourceUpdateComparison(baseline, proposed)

    const rejected = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'categories:categories': false },
      {},
      {},
    )
    assert.deepEqual(rejected.data.categoryIds, [1, 999])

    const working = createStructuredWorkingValues(proposed)
    working.categoryIds = [1, 999]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const edited = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'categories:categories': true },
      {},
      structuredEdits,
    )
    assert.deepEqual(edited.data.categoryIds, [1, 999])
  })
})

describe('Filters structured moderation composition', () => {
  it('accept / reject / edit filters independently', () => {
    const baseline = resource({ filterIds: [10, 20] })
    const proposed = resource({ filterIds: [10, 30] })
    const comparison = buildResourceUpdateComparison(baseline, proposed)

    const accepted = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'categories:filters': true },
      {},
      {},
    )
    assert.deepEqual(accepted.data.filterIds, [10, 30])

    const rejected = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'categories:filters': false },
      {},
      {},
    )
    assert.deepEqual(rejected.data.filterIds, [10, 20])

    const working = createStructuredWorkingValues(proposed)
    working.filterIds = [40]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const edited = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'categories:filters': true },
      {},
      structuredEdits,
    )
    assert.deepEqual(edited.data.filterIds, [40])
  })

  it('allows empty filters', () => {
    const proposed = resource({ filterIds: [10] })
    const working = createStructuredWorkingValues(proposed)
    working.filterIds = []
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(
      resource({ filterIds: [10] }),
      proposed,
    )
    const composed = composeResourceUpdateFinalVersion(
      resource({ filterIds: [10] }),
      proposed,
      comparison,
      { 'categories:filters': true },
      {},
      structuredEdits,
    )
    assert.deepEqual(composed.data.filterIds, [])
    assert.equal(isExistingResourceComplete(composed.data), true)
  })

  it('preserves unknown historical filter ids', () => {
    const baseline = resource({ filterIds: [10, 888] })
    const proposed = resource({ filterIds: [10, 888, 11] })
    const working = createStructuredWorkingValues(proposed)
    working.filterIds = [888]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'categories:filters': true },
      {},
      structuredEdits,
    )
    assert.deepEqual(composed.data.filterIds, [888])
  })
})

describe('Categories + Filters cross-field composition', () => {
  it('composes category edit + filter edit', () => {
    const baseline = resource({ categoryIds: [1], filterIds: [10] })
    const proposed = resource({ categoryIds: [2], filterIds: [20] })
    const working = createStructuredWorkingValues(proposed)
    working.categoryIds = [3]
    working.filterIds = [30]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      {
        'categories:categories': true,
        'categories:filters': true,
      },
      {},
      structuredEdits,
    )
    assert.deepEqual(composed.data.categoryIds, [3])
    assert.deepEqual(composed.data.filterIds, [30])
  })

  it('composes category edit + filter reject independently', () => {
    const baseline = resource({ categoryIds: [1], filterIds: [10] })
    const proposed = resource({ categoryIds: [2], filterIds: [20] })
    const working = createStructuredWorkingValues(proposed)
    working.categoryIds = [9]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      {
        'categories:categories': true,
        'categories:filters': false,
      },
      {},
      structuredEdits,
    )
    assert.deepEqual(composed.data.categoryIds, [9])
    assert.deepEqual(composed.data.filterIds, [10])
  })

  it('composes category reject + filter edit independently', () => {
    const baseline = resource({ categoryIds: [1], filterIds: [10] })
    const proposed = resource({ categoryIds: [2], filterIds: [20] })
    const working = createStructuredWorkingValues(proposed)
    working.filterIds = [99]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      {
        'categories:categories': false,
        'categories:filters': true,
      },
      {},
      structuredEdits,
    )
    assert.deepEqual(composed.data.categoryIds, [1])
    assert.deepEqual(composed.data.filterIds, [99])
  })

  it('does not cascade category changes into filters', () => {
    const proposed = resource({ categoryIds: [1], filterIds: [10, 20] })
    const working = createStructuredWorkingValues(proposed)
    working.categoryIds = [2]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    assert.equal('categories:filters' in structuredEdits, false)
    assert.deepEqual(working.filterIds, [10, 20])
  })
})

describe('Categories / Filters form section + legacy bypass', () => {
  it('marks Categories section edited for category or filter id changes only', () => {
    const baseline = resource({
      categoryIds: [1, 2],
      filterIds: [10],
      locations: [
        createEmptyLocation({
          streetAddress: '123 Main',
          lat: 1,
          lng: 2,
        }),
      ],
      accessMode: 'physical',
      onlineUrl: '',
    })

    const reorderOnly = structuredClone(baseline)
    reorderOnly.categoryIds = [2, 1]
    reorderOnly.filterIds = [10]
    assert.equal(hasResourceDataChanges(baseline, reorderOnly), false)

    const categoryChange = structuredClone(baseline)
    categoryChange.categoryIds = [1, 3]
    assert.ok(
      getEditedUpdateSections(baseline, categoryChange).includes('categories'),
    )

    const filterChange = structuredClone(baseline)
    filterChange.filterIds = [10, 11]
    assert.ok(
      getEditedUpdateSections(baseline, filterChange).includes('categories'),
    )
  })

  it('does not treat categories/filters as legacy string fields', () => {
    assert.equal(
      isResourceUpdateStructuredFieldId('categories:categories'),
      true,
    )
    assert.equal(isResourceUpdateStructuredFieldId('categories:filters'), true)

    const baseline = resource({ categoryIds: [1] })
    const proposed = resource({ categoryIds: [2] })
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'categories:categories': true },
      { 'categories:categories': 'Food Support, Housing' },
      {},
    )
    assert.deepEqual(composed.data.categoryIds, [2])
  })
})

describe('mergeLookupOptionsWithSelectedIds', () => {
  it('appends missing selected ids with fallback labels', () => {
    const merged = mergeLookupOptionsWithSelectedIds(
      [{ id: 1, name: 'Food' }],
      [1, 999, 999],
      { 1: 'Food' },
    )
    assert.deepEqual(merged, [
      { id: 1, name: 'Food' },
      { id: 999, name: 'ID 999' },
    ])
  })

  it('uses provided historical names when available', () => {
    const merged = mergeLookupOptionsWithSelectedIds(
      [{ id: 1, name: 'Food' }],
      [888],
      { 888: 'Legacy Filter' },
    )
    assert.deepEqual(merged[1], { id: 888, name: 'Legacy Filter' })
  })
})
