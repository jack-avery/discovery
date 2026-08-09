import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ResourceContactMethod } from '@/types/submission'
import {
  areContactsEquivalent,
  canonicalizeContacts,
} from './contactEquality'
import {
  createContactMethod,
  createEmptyExistingResourceData,
} from '@/features/submissions/existingResource/emptyState'
import {
  getEditedUpdateSections,
  hasResourceDataChanges,
} from '@/features/submissions/updateRequest/updateSectionDiff'

function phone(
  value: string,
  label = '',
  id = 'c1',
): ResourceContactMethod {
  return createContactMethod({ id, type: 'phone', value, label })
}

describe('canonicalizeContacts / areContactsEquivalent', () => {
  it('treats E.164 and national formats of the same number as equal', () => {
    assert.equal(
      areContactsEquivalent(
        [phone('+16134138209')],
        [phone('(613) 413-8209')],
      ),
      true,
    )
    assert.deepEqual(canonicalizeContacts([phone('+16134138209')]), [
      { type: 'phone', value: '+16134138209', label: '' },
    ])
    assert.deepEqual(canonicalizeContacts([phone('(613) 413-8209')]), [
      { type: 'phone', value: '+16134138209', label: '' },
    ])
  })

  it('treats hyphenated national format as equal to E.164', () => {
    assert.equal(
      areContactsEquivalent(
        [phone('+16134138209')],
        [phone('613-413-8209')],
      ),
      true,
    )
  })

  it('detects a different phone number', () => {
    assert.equal(
      areContactsEquivalent(
        [phone('+16134138209')],
        [phone('+16135551234')],
      ),
      false,
    )
  })

  it('detects label-only changes', () => {
    assert.equal(
      areContactsEquivalent(
        [phone('+16134138209', 'Main Line')],
        [phone('(613) 413-8209', 'Reception')],
      ),
      false,
    )
  })

  it('detects type-only changes', () => {
    assert.equal(
      areContactsEquivalent(
        [phone('+16134138209')],
        [createContactMethod({ id: 'c1', type: 'other', value: '+16134138209' })],
      ),
      false,
    )
  })

  it('ignores contact ids and order', () => {
    assert.equal(
      areContactsEquivalent(
        [
          phone('+16134138209', '', 'a'),
          createContactMethod({
            id: 'b',
            type: 'email',
            value: 'a@example.org',
          }),
        ],
        [
          createContactMethod({
            id: 'z',
            type: 'email',
            value: 'a@example.org',
          }),
          phone('(613) 413-8209', '', 'y'),
        ],
      ),
      true,
    )
  })

  it('ignores empty placeholder contacts', () => {
    assert.equal(
      areContactsEquivalent(
        [phone('+16134138209'), createContactMethod({ id: 'empty' })],
        [phone('(613) 413-8209')],
      ),
      true,
    )
  })
})

describe('canonicalizeContacts / areContactsEquivalent — website slices', () => {
  function website(
    value: string,
    label = '',
    id = 'w1',
  ): ResourceContactMethod {
    return createContactMethod({ id, type: 'website', value, label })
  }

  it('treats exact same website as equal', () => {
    assert.equal(
      areContactsEquivalent(
        [website('https://example.com', 'Main')],
        [website('https://example.com', 'Main')],
      ),
      true,
    )
  })

  it('ignores whitespace-only differences', () => {
    assert.equal(
      areContactsEquivalent(
        [website('  https://example.com  ', ' Main ')],
        [website('https://example.com', 'Main')],
      ),
      true,
    )
  })

  it('detects label differences', () => {
    assert.equal(
      areContactsEquivalent(
        [website('https://example.com', 'Main')],
        [website('https://example.com', 'Alt')],
      ),
      false,
    )
  })

  it('detects URL/value differences without inventing URL normalization', () => {
    assert.equal(
      areContactsEquivalent(
        [website('https://example.com')],
        [website('https://example.com/')],
      ),
      false,
    )
    assert.equal(
      areContactsEquivalent(
        [website('https://example.com')],
        [website('HTTPS://EXAMPLE.COM')],
      ),
      false,
    )
    assert.equal(
      areContactsEquivalent(
        [website('example.com')],
        [website('https://example.com')],
      ),
      false,
    )
  })

  it('ignores reorder and UI ids', () => {
    assert.equal(
      areContactsEquivalent(
        [
          website('https://a.example', 'A', '1'),
          website('https://b.example', 'B', '2'),
        ],
        [
          website('https://b.example', 'B', 'x'),
          website('https://a.example', 'A', 'y'),
        ],
      ),
      true,
    )
  })

  it('detects add and remove', () => {
    assert.equal(
      areContactsEquivalent(
        [website('https://a.example')],
        [website('https://a.example'), website('https://b.example')],
      ),
      false,
    )
    assert.equal(
      areContactsEquivalent(
        [website('https://a.example'), website('https://b.example')],
        [website('https://a.example')],
      ),
      false,
    )
  })

  it('treats restore to proposed-equivalent slice as equal', () => {
    const proposed = [website('https://example.com', 'Main', 'p1')]
    const restored = [website('https://example.com', 'Main', 'restored')]
    assert.equal(areContactsEquivalent(proposed, restored), true)
    assert.deepEqual(canonicalizeContacts(restored), [
      { type: 'website', value: 'https://example.com', label: 'Main' },
    ])
  })
})

describe('hasResourceDataChanges contact regression', () => {
  it('does not treat remove-then-restore equivalent phone as a change', () => {
    const baseline = createEmptyExistingResourceData()
    baseline.contacts = [phone('+16134138209')]
    baseline.name = 'Test Resource'
    baseline.description = 'A description'
    baseline.categoryIds = [1]
    baseline.accessMode = 'online'
    baseline.onlineUrl = 'https://example.org'

    // Intermediate removal would fail completeness; final state restores
    // the same number in national format (PhoneInput blur output).
    const current = structuredClone(baseline)
    current.contacts = [phone('(613) 413-8209', '', 'new-id')]

    assert.equal(hasResourceDataChanges(baseline, current), false)
    assert.deepEqual(getEditedUpdateSections(baseline, current), [])
  })

  it('detects an actual phone number change', () => {
    const baseline = createEmptyExistingResourceData()
    baseline.contacts = [phone('+16134138209')]
    baseline.name = 'Test Resource'
    baseline.description = 'A description'
    baseline.categoryIds = [1]
    baseline.accessMode = 'online'
    baseline.onlineUrl = 'https://example.org'

    const current = structuredClone(baseline)
    current.contacts = [phone('+16135551234')]

    assert.equal(hasResourceDataChanges(baseline, current), true)
    assert.ok(getEditedUpdateSections(baseline, current).includes('contact'))
  })

  it('marks only non-contact sections when contacts are semantically unchanged', () => {
    const baseline = createEmptyExistingResourceData()
    baseline.contacts = [phone('+16134138209')]
    baseline.name = 'Test Resource'
    baseline.description = 'A description'
    baseline.categoryIds = [1]
    baseline.accessMode = 'online'
    baseline.onlineUrl = 'https://example.org'

    const current = structuredClone(baseline)
    current.contacts = [phone('(613) 413-8209')]
    current.description = 'Updated description'

    const edited = getEditedUpdateSections(baseline, current)
    assert.deepEqual(edited, ['about'])
    assert.equal(hasResourceDataChanges(baseline, current), true)
  })
})
