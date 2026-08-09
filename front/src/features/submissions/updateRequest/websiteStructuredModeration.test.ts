import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type {
  ExistingResourceData,
  ResourceContactMethod,
} from '@/types/submission'
import {
  createContactMethod,
  createEmptyExistingResourceData,
} from '@/features/submissions/existingResource/emptyState'
import {
  isExistingResourceComplete,
  validateExistingResource,
} from '@/features/submissions/existingResource/validation'
import { fieldErrorForUpdateComparisonField } from '@/features/staff/submissions/updateReview/updateReviewFieldErrors'
import { buildResourceUpdateComparison } from '@/features/submissions/updateRequest/buildResourceUpdateComparison'
import { composeResourceUpdateFinalVersion } from '@/features/submissions/updateRequest/composeResourceUpdateFinalVersion'
import {
  createStructuredWorkingValues,
  isResourceUpdateStructuredFieldId,
  isStructuredWorkingFieldEdited,
  structuredEditsFromWorking,
  websiteContacts,
} from '@/features/submissions/updateRequest/resourceUpdateStructuredFields'
import {
  getEditedUpdateSections,
  hasResourceDataChanges,
} from '@/features/submissions/updateRequest/updateSectionDiff'

function phone(
  value: string,
  label = '',
  id = 'phone-1',
): ResourceContactMethod {
  return createContactMethod({ id, type: 'phone', value, label })
}

function website(
  value: string,
  label = '',
  id = 'web-1',
): ResourceContactMethod {
  return createContactMethod({ id, type: 'website', value, label })
}

function resource(
  contacts: ResourceContactMethod[],
  partial: Partial<ExistingResourceData> = {},
): ExistingResourceData {
  const data = createEmptyExistingResourceData()
  data.name = 'Test Resource'
  data.description = 'A description'
  data.categoryIds = [1]
  data.accessMode = 'online'
  data.onlineUrl = 'https://example.org'
  data.contacts = contacts
  return { ...data, ...partial }
}

function websitesField(
  baseline: ExistingResourceData,
  proposed: ExistingResourceData,
) {
  return buildResourceUpdateComparison(baseline, proposed)
    .sections.flatMap((section) => section.fields)
    .find((field) => field.id === 'website:websites')
}

function contactIds(contacts: ResourceContactMethod[]): string[] {
  return contacts.map((c) => `${c.type}:${c.value}:${c.label}`)
}

describe('Website comparison changed flag', () => {
  it('is unchanged when website slice is reordered', () => {
    const a = website('https://a.example', 'A', '1')
    const b = website('https://b.example', 'B', '2')
    const baseline = resource([a, b])
    const proposed = resource([
      website('https://b.example', 'B', 'x'),
      website('https://a.example', 'A', 'y'),
    ])
    const field = websitesField(baseline, proposed)
    assert.ok(field)
    assert.equal(field.changed, false)
  })

  it('is unchanged when only UI ids differ', () => {
    const baseline = resource([website('https://example.com', 'Site', 'old')])
    const proposed = resource([website('https://example.com', 'Site', 'new')])
    const field = websitesField(baseline, proposed)
    assert.ok(field)
    assert.equal(field.changed, false)
  })

  it('is changed for a real URL/value change', () => {
    const baseline = resource([website('https://example.com')])
    const proposed = resource([website('https://example.org')])
    const field = websitesField(baseline, proposed)
    assert.ok(field)
    assert.equal(field.changed, true)
  })

  it('is changed for a label change', () => {
    const baseline = resource([website('https://example.com', 'Main')])
    const proposed = resource([website('https://example.com', 'Homepage')])
    const field = websitesField(baseline, proposed)
    assert.ok(field)
    assert.equal(field.changed, true)
  })

  it('preserves trailing-slash URL distinction', () => {
    const baseline = resource([website('https://example.com')])
    const proposed = resource([website('https://example.com/')])
    const field = websitesField(baseline, proposed)
    assert.ok(field)
    assert.equal(field.changed, true)
  })

  it('preserves protocol / hostname-case distinctions', () => {
    const baseline = resource([website('https://example.com')])
    const proposedCase = resource([website('HTTPS://EXAMPLE.COM')])
    const proposedProto = resource([website('example.com')])
    assert.equal(websitesField(baseline, proposedCase)?.changed, true)
    assert.equal(websitesField(baseline, proposedProto)?.changed, true)
  })
})

describe('Website structured dirty detection', () => {
  it('is not edited for reorder / whitespace / id-only differences', () => {
    const proposed = resource([
      website('https://a.example', 'A', '1'),
      website('https://b.example', 'B', '2'),
    ])
    const working = createStructuredWorkingValues(proposed)
    working.websites = [
      website('  https://b.example  ', ' B ', 'x'),
      website('https://a.example', 'A', 'y'),
    ]
    assert.equal(
      isStructuredWorkingFieldEdited('website:websites', proposed, working),
      false,
    )
    assert.equal(
      'website:websites' in structuredEditsFromWorking(proposed, working),
      false,
    )
  })

  it('is edited for URL / label / add / remove', () => {
    const proposed = resource([website('https://example.com', 'Main')])
    const workingUrl = createStructuredWorkingValues(proposed)
    workingUrl.websites = [website('https://other.example', 'Main')]
    assert.equal(
      isStructuredWorkingFieldEdited('website:websites', proposed, workingUrl),
      true,
    )

    const workingLabel = createStructuredWorkingValues(proposed)
    workingLabel.websites = [website('https://example.com', 'Alt')]
    assert.equal(
      isStructuredWorkingFieldEdited(
        'website:websites',
        proposed,
        workingLabel,
      ),
      true,
    )

    const workingAdd = createStructuredWorkingValues(proposed)
    workingAdd.websites = [
      ...workingAdd.websites,
      website('https://extra.example', '', 'extra'),
    ]
    assert.equal(
      isStructuredWorkingFieldEdited('website:websites', proposed, workingAdd),
      true,
    )

    const workingRemove = createStructuredWorkingValues(proposed)
    workingRemove.websites = []
    assert.equal(
      isStructuredWorkingFieldEdited(
        'website:websites',
        proposed,
        workingRemove,
      ),
      true,
    )
  })

  it('clears override when restored to proposed semantics', () => {
    const proposed = resource([website('https://example.com')])
    const working = createStructuredWorkingValues(proposed)
    working.websites = [website('https://other.example')]
    assert.equal(
      isStructuredWorkingFieldEdited('website:websites', proposed, working),
      true,
    )
    working.websites = [website('https://example.com', '', 'restored')]
    assert.equal(
      isStructuredWorkingFieldEdited('website:websites', proposed, working),
      false,
    )
  })

  it('is recognized as a structured field id', () => {
    assert.equal(isResourceUpdateStructuredFieldId('website:websites'), true)
  })
})

describe('Contacts × Websites cross-field composition', () => {
  const phoneA = phone('+16135550001', '', 'pa')
  const phoneB = phone('+16135550002', '', 'pb')
  const phoneC = phone('+16135550003', '', 'pc')
  const websiteA = website('https://a.example', '', 'wa')
  const websiteB = website('https://b.example', '', 'wb')
  const websiteC = website('https://c.example', '', 'wc')

  const baseline = resource([phoneA, websiteA])
  const proposed = resource([phoneB, websiteB])

  function compose(
    accepted: Record<string, boolean>,
    structuredEdits: Parameters<
      typeof composeResourceUpdateFinalVersion
    >[5] = {},
  ) {
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    return composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      accepted,
      {},
      structuredEdits,
    )
  }

  it('A: accept contacts + accept websites → Phone B, Website B', () => {
    const composed = compose({
      'contact:contacts': true,
      'website:websites': true,
    })
    assert.deepEqual(contactIds(composed.data.contacts), [
      'phone:+16135550002:',
      'website:https://b.example:',
    ])
  })

  it('B: reject contacts + accept websites → Phone A, Website B', () => {
    const composed = compose({
      'contact:contacts': false,
      'website:websites': true,
    })
    assert.deepEqual(contactIds(composed.data.contacts), [
      'phone:+16135550001:',
      'website:https://b.example:',
    ])
  })

  it('C: accept contacts + reject websites → Phone B, Website A', () => {
    const composed = compose({
      'contact:contacts': true,
      'website:websites': false,
    })
    assert.deepEqual(contactIds(composed.data.contacts), [
      'phone:+16135550002:',
      'website:https://a.example:',
    ])
  })

  it('D: reject contacts + reject websites → Phone A, Website A', () => {
    const composed = compose({
      'contact:contacts': false,
      'website:websites': false,
    })
    assert.deepEqual(contactIds(composed.data.contacts), [
      'phone:+16135550001:',
      'website:https://a.example:',
    ])
  })

  it('E: edit contacts → Phone C, reject websites → Phone C, Website A', () => {
    const working = createStructuredWorkingValues(proposed)
    working.contacts = [phoneC]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const composed = compose(
      { 'contact:contacts': true, 'website:websites': false },
      structuredEdits,
    )
    assert.deepEqual(contactIds(composed.data.contacts), [
      'phone:+16135550003:',
      'website:https://a.example:',
    ])
  })

  it('F: reject contacts, edit websites → Website C → Phone A, Website C', () => {
    const working = createStructuredWorkingValues(proposed)
    working.websites = [websiteC]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const composed = compose(
      { 'contact:contacts': false, 'website:websites': true },
      structuredEdits,
    )
    assert.deepEqual(contactIds(composed.data.contacts), [
      'phone:+16135550001:',
      'website:https://c.example:',
    ])
  })

  it('G: edit contacts → Phone C and websites → Website C', () => {
    const working = createStructuredWorkingValues(proposed)
    working.contacts = [phoneC]
    working.websites = [websiteC]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const composed = compose(
      { 'contact:contacts': true, 'website:websites': true },
      structuredEdits,
    )
    assert.deepEqual(contactIds(composed.data.contacts), [
      'phone:+16135550003:',
      'website:https://c.example:',
    ])
  })

  it('structured contacts edit preserves proposed websites', () => {
    const working = createStructuredWorkingValues(proposed)
    working.contacts = [phoneC]
    const structuredEdits = structuredEditsFromWorking(proposed, working)
    const composed = compose(
      { 'contact:contacts': true, 'website:websites': true },
      structuredEdits,
    )
    assert.deepEqual(
      websiteContacts(composed.data.contacts).map((c) => c.value),
      ['https://b.example'],
    )
  })

  it('legacy string edit for website:websites does not mutate contacts', () => {
    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const composed = composeResourceUpdateFinalVersion(
      baseline,
      proposed,
      comparison,
      { 'contact:contacts': true, 'website:websites': true },
      { 'website:websites': 'https://legacy-only.example' },
      {},
    )
    assert.deepEqual(contactIds(composed.data.contacts), [
      'phone:+16135550002:',
      'website:https://b.example:',
    ])
  })
})

describe('Website form section regression', () => {
  it('website-only change marks website section, not contact', () => {
    const baseline = resource([
      phone('+16135550001'),
      website('https://a.example'),
    ])
    const current = structuredClone(baseline)
    current.contacts = [phone('+16135550001'), website('https://b.example')]
    const edited = getEditedUpdateSections(baseline, current)
    assert.ok(edited.includes('website'))
    assert.equal(edited.includes('contact'), false)
  })

  it('restore website clears website section when moreInfoUrl unchanged', () => {
    const baseline = resource([website('https://a.example')])
    baseline.moreInfoUrl = 'https://info.example'
    const current = structuredClone(baseline)
    current.contacts = [website('https://b.example')]
    assert.ok(getEditedUpdateSections(baseline, current).includes('website'))
    current.contacts = [website('https://a.example', '', 'new-id')]
    assert.equal(hasResourceDataChanges(baseline, current), false)
    assert.deepEqual(getEditedUpdateSections(baseline, current), [])
  })

  it('phone + website changes mark both sections', () => {
    const baseline = resource([
      phone('+16135550001'),
      website('https://a.example'),
    ])
    const current = structuredClone(baseline)
    current.contacts = [
      phone('+16135550002'),
      website('https://b.example'),
    ]
    const edited = getEditedUpdateSections(baseline, current)
    assert.ok(edited.includes('contact'))
    assert.ok(edited.includes('website'))
  })

  it('phone formatting equivalence does not mark website', () => {
    const baseline = resource([
      phone('+16135550001'),
      website('https://a.example'),
    ])
    const current = structuredClone(baseline)
    current.contacts = [
      phone('(613) 555-0001', '', 'new'),
      website('https://a.example'),
    ]
    assert.deepEqual(getEditedUpdateSections(baseline, current), [])
  })
})

describe('Website validation / historical invalid', () => {
  it('no websites + valid phone remains complete', () => {
    const data = resource([phone('+16135551234')])
    assert.equal(isExistingResourceComplete(data), true)
  })

  it('invalid website blocks completeness', () => {
    const data = resource([
      phone('+16135551234'),
      website('not-a-url', '', 'bad'),
    ])
    assert.equal(isExistingResourceComplete(data), false)
    const errors = validateExistingResource(data)
    assert.ok(errors.contactValues?.bad)
  })

  it('maps invalid website errors to website:websites', () => {
    const data = resource([
      phone('+16135551234'),
      website('not-a-url', '', 'bad'),
    ])
    const errors = validateExistingResource(data)
    assert.equal(
      fieldErrorForUpdateComparisonField(errors, 'website:websites', data),
      errors.contacts,
    )
    assert.equal(
      fieldErrorForUpdateComparisonField(errors, 'contact:contacts', data),
      undefined,
    )
  })

  it('maps invalid phone errors to contact:contacts', () => {
    const data = resource([
      phone('bad-phone', '', 'bad-phone'),
      website('https://example.com'),
    ])
    const errors = validateExistingResource(data)
    assert.equal(
      fieldErrorForUpdateComparisonField(errors, 'contact:contacts', data),
      errors.contacts,
    )
    assert.equal(
      fieldErrorForUpdateComparisonField(errors, 'website:websites', data),
      undefined,
    )
  })

  it('keeps historical invalid website in working state', () => {
    const proposed = resource([
      phone('+16135551234'),
      website('not-a-url', 'Legacy', 'legacy'),
    ])
    const working = createStructuredWorkingValues(proposed)
    assert.equal(working.websites.length, 1)
    assert.equal(working.websites[0]?.value, 'not-a-url')
    assert.equal(working.websites[0]?.label, 'Legacy')
    assert.equal(
      isStructuredWorkingFieldEdited('website:websites', proposed, working),
      false,
    )
  })
})
