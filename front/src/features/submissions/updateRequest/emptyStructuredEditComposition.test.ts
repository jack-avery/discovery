import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type {
  ExistingResourceData,
  ExistingResourceLocation,
  ResourceContactMethod,
} from '@/types/submission'
import {
  createContactMethod,
  createEmptyExistingResourceData,
  createEmptyLocation,
} from '@/features/submissions/existingResource/emptyState'
import { isExistingResourceComplete } from '@/features/submissions/existingResource/validation'
import { buildResourceUpdateComparison } from '@/features/submissions/updateRequest/buildResourceUpdateComparison'
import { composeResourceUpdateFinalVersion } from '@/features/submissions/updateRequest/composeResourceUpdateFinalVersion'
import {
  createStructuredWorkingValues,
  isStructuredWorkingFieldEdited,
  structuredEditsFromWorking,
} from '@/features/submissions/updateRequest/resourceUpdateStructuredFields'

function phone(
  value: string,
  id = 'phone-1',
): ResourceContactMethod {
  return createContactMethod({ id, type: 'phone', value, label: '' })
}

function website(
  value: string,
  id = 'web-1',
): ResourceContactMethod {
  return createContactMethod({ id, type: 'website', value, label: '' })
}

function location(street: string, id = 'loc-1'): ExistingResourceLocation {
  return createEmptyLocation({
    id,
    streetAddress: street,
    city: 'Ottawa',
    province: 'ON',
    postalCode: 'K1A 0B1',
  })
}

function resource(
  partial: Partial<ExistingResourceData> = {},
): ExistingResourceData {
  const data = createEmptyExistingResourceData()
  data.name = 'Test Resource'
  data.description = 'A description'
  data.categoryIds = [1]
  data.accessMode = 'online'
  data.onlineUrl = 'https://example.org'
  data.contacts = [phone('+16135551234')]
  return { ...data, ...partial }
}

function contactIds(contacts: ResourceContactMethod[]): string[] {
  return contacts.map((c) => `${c.type}:${c.value}`)
}

describe('Empty-array structured edit composition', () => {
  it('clears non-website contacts while preserving proposed websites', () => {
    const baseline = resource({
      contacts: [phone('+16135550001', 'pa'), website('https://a.example', 'wa')],
    })
    const proposed = resource({
      contacts: [phone('+16135550002', 'pb'), website('https://b.example', 'wb')],
    })
    const working = createStructuredWorkingValues(proposed)
    working.contacts = []
    assert.equal(
      isStructuredWorkingFieldEdited('contact:contacts', proposed, working),
      true,
    )
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    assert.deepEqual(structuredEdits['contact:contacts'], [])

    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'contact:contacts': true, 'website:websites': true },
      {},
      structuredEdits,
    )
    assert.deepEqual(contactIds(composed.data.contacts), [
      'website:https://b.example',
    ])
    assert.equal(composed.differsFromProposed, true)
    assert.equal(isExistingResourceComplete(composed.data), true)
  })

  it('clears contacts and rejects websites → baseline website only', () => {
    const baseline = resource({
      contacts: [phone('+16135550001', 'pa'), website('https://a.example', 'wa')],
    })
    const proposed = resource({
      contacts: [phone('+16135550002', 'pb'), website('https://b.example', 'wb')],
    })
    const working = createStructuredWorkingValues(proposed)
    working.contacts = []
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'contact:contacts': true, 'website:websites': false },
      {},
      structuredEdits,
    )
    assert.deepEqual(contactIds(composed.data.contacts), [
      'website:https://a.example',
    ])
  })

  it('clears both contact slices → empty contacts array', () => {
    const baseline = resource({
      contacts: [phone('+16135550001', 'pa'), website('https://a.example', 'wa')],
    })
    const proposed = resource({
      contacts: [phone('+16135550002', 'pb'), website('https://b.example', 'wb')],
    })
    const working = createStructuredWorkingValues(proposed)
    working.contacts = []
    working.websites = []
    assert.equal(
      isStructuredWorkingFieldEdited('contact:contacts', proposed, working),
      true,
    )
    assert.equal(
      isStructuredWorkingFieldEdited('website:websites', proposed, working),
      true,
    )
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    assert.deepEqual(structuredEdits['contact:contacts'], [])
    assert.deepEqual(structuredEdits['website:websites'], [])

    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'contact:contacts': true, 'website:websites': true },
      {},
      structuredEdits,
    )
    assert.deepEqual(composed.data.contacts, [])
    assert.equal(isExistingResourceComplete(composed.data), false)
  })

  it('clears locations to an empty array', () => {
    const baseline = resource({
      accessMode: 'physical',
      onlineUrl: '',
      locations: [location('1 Baseline St', 'la')],
    })
    const proposed = resource({
      accessMode: 'physical',
      onlineUrl: '',
      locations: [location('2 Proposed St', 'lb')],
    })
    const working = createStructuredWorkingValues(proposed)
    working.locations = []
    assert.equal(
      isStructuredWorkingFieldEdited('address:locations', proposed, working),
      true,
    )
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    assert.deepEqual(structuredEdits['address:locations'], [])

    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'address:locations': true, 'address:accessMode': true },
      {},
      structuredEdits,
    )
    assert.deepEqual(composed.data.locations, [])
    assert.equal(composed.differsFromProposed, true)
    // Physical + empty locations is incomplete; composition still applies [].
    assert.equal(isExistingResourceComplete(composed.data), false)
  })

  it('clears leftover online locations without breaking completeness', () => {
    const baseline = resource({
      accessMode: 'online',
      onlineUrl: 'https://example.org',
      locations: [location('Stale St', 'stale')],
    })
    const proposed = resource({
      accessMode: 'online',
      onlineUrl: 'https://example.org',
      locations: [location('Stale St', 'stale')],
    })
    const working = createStructuredWorkingValues(proposed)
    working.locations = []
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'address:locations': true },
      {},
      structuredEdits,
    )
    assert.deepEqual(composed.data.locations, [])
    assert.equal(isExistingResourceComplete(composed.data), true)
  })

  it('clears filters to an empty array', () => {
    const baseline = resource({ filterIds: [1, 2] })
    const proposed = resource({ filterIds: [1, 2] })
    const working = createStructuredWorkingValues(proposed)
    working.filterIds = []
    assert.equal(
      isStructuredWorkingFieldEdited('categories:filters', proposed, working),
      true,
    )
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    assert.deepEqual(structuredEdits['categories:filters'], [])

    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'categories:filters': true },
      {},
      structuredEdits,
    )
    assert.deepEqual(composed.data.filterIds, [])
    assert.equal(composed.differsFromProposed, true)
  })

  it('clears categories to [] and fails completeness', () => {
    const baseline = resource({ categoryIds: [1] })
    const proposed = resource({ categoryIds: [1, 2] })
    const working = createStructuredWorkingValues(proposed)
    working.categoryIds = []
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    assert.deepEqual(structuredEdits['categories:categories'], [])

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

  it('treats accessMode null as a present structured edit', () => {
    const baseline = resource({ accessMode: 'physical', onlineUrl: '' })
    const proposed = resource({
      accessMode: 'online',
      onlineUrl: 'https://example.org',
      locations: [],
    })
    // Compose-level presence: key present with null is an intentional override.
    const structuredEdits = {
      'address:accessMode': null,
    }
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'address:accessMode': true },
      {},
      structuredEdits,
    )
    assert.equal(composed.data.accessMode, null)
    assert.equal(composed.differsFromProposed, true)
  })
})
