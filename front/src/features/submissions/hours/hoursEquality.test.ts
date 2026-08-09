import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { DayHours, HoursAvailability } from '@/types/submission'
import {
  createDefaultHours,
  createEmptyExistingResourceData,
} from '@/features/submissions/existingResource/emptyState'
import { buildResourceUpdateComparison } from '@/features/submissions/updateRequest/buildResourceUpdateComparison'
import {
  getEditedUpdateSections,
  hasResourceDataChanges,
} from '@/features/submissions/updateRequest/updateSectionDiff'
import {
  areHoursEquivalent,
  canonicalizeHours,
} from './hoursEquality'

function slice(
  hoursAvailability: HoursAvailability,
  hours: DayHours[],
) {
  return { hoursAvailability, hours }
}

function day(
  dayOfWeek: number,
  partial: Partial<Omit<DayHours, 'dayOfWeek'>> = {},
): DayHours {
  return {
    dayOfWeek,
    isClosed: false,
    opensAt: '09:00',
    closesAt: '17:00',
    byAppointment: false,
    ...partial,
  }
}

describe('canonicalizeHours / areHoursEquivalent', () => {
  it('treats exact same schedules as equal', () => {
    const hours = createDefaultHours()
    assert.equal(
      areHoursEquivalent(
        slice('structured', hours),
        slice('structured', structuredClone(hours)),
      ),
      true,
    )
  })

  it('treats reordered day entries as equal', () => {
    const a = [day(1), day(2, { opensAt: '10:00' })]
    const b = [day(2, { opensAt: '10:00' }), day(1)]
    assert.equal(
      areHoursEquivalent(slice('structured', a), slice('structured', b)),
      true,
    )
    assert.deepEqual(
      canonicalizeHours(slice('structured', b)).hours.map((row) => row.dayOfWeek),
      [1, 2],
    )
  })

  it('detects opening-time and closing-time changes', () => {
    assert.equal(
      areHoursEquivalent(
        slice('structured', [day(1, { opensAt: '09:00' })]),
        slice('structured', [day(1, { opensAt: '10:00' })]),
      ),
      false,
    )
    assert.equal(
      areHoursEquivalent(
        slice('structured', [day(1, { closesAt: '17:00' })]),
        slice('structured', [day(1, { closesAt: '18:00' })]),
      ),
      false,
    )
  })

  it('detects availability mode changes', () => {
    const hours = createDefaultHours()
    assert.equal(
      areHoursEquivalent(
        slice('structured', hours),
        slice('varies', hours),
      ),
      false,
    )
  })

  it('ignores stale times on closed days', () => {
    assert.equal(
      areHoursEquivalent(
        slice('structured', [
          day(0, {
            isClosed: true,
            opensAt: '09:00',
            closesAt: '17:00',
          }),
        ]),
        slice('structured', [
          day(0, {
            isClosed: true,
            opensAt: '',
            closesAt: '',
          }),
        ]),
      ),
      true,
    )
  })

  it('ignores stale times on by-appointment days', () => {
    assert.equal(
      areHoursEquivalent(
        slice('structured', [
          day(1, {
            byAppointment: true,
            opensAt: '09:00',
            closesAt: '17:00',
          }),
        ]),
        slice('structured', [
          day(1, {
            byAppointment: true,
            opensAt: '',
            closesAt: '',
          }),
        ]),
      ),
      true,
    )
  })

  it('ignores leftover schedule when availability is not structured', () => {
    assert.equal(
      areHoursEquivalent(
        slice('varies', [
          day(1, { opensAt: '09:00' }),
          day(2, { opensAt: '10:00' }),
        ]),
        slice('varies', [
          day(3, { isClosed: true, opensAt: '', closesAt: '' }),
        ]),
      ),
      true,
    )
    assert.deepEqual(canonicalizeHours(slice('contact_for_hours', createDefaultHours())), {
      hoursAvailability: 'contact_for_hours',
      hours: [],
    })
  })
})

describe('hasResourceDataChanges hours regression', () => {
  it('treats restore of original structured schedule as unchanged', () => {
    const baseline = createEmptyExistingResourceData()
    baseline.name = 'Test Resource'
    baseline.description = 'A description'
    baseline.categoryIds = [1]
    baseline.accessMode = 'online'
    baseline.onlineUrl = 'https://example.org'
    baseline.hoursAvailability = 'structured'
    baseline.hours = createDefaultHours()

    const current = structuredClone(baseline)
    current.hours = [...baseline.hours].reverse()

    assert.equal(hasResourceDataChanges(baseline, current), false)
    assert.deepEqual(getEditedUpdateSections(baseline, current), [])
  })

  it('detects a genuine time change', () => {
    const baseline = createEmptyExistingResourceData()
    baseline.name = 'Test Resource'
    baseline.description = 'A description'
    baseline.categoryIds = [1]
    baseline.accessMode = 'online'
    baseline.onlineUrl = 'https://example.org'
    baseline.hoursAvailability = 'structured'
    baseline.hours = createDefaultHours()

    const current = structuredClone(baseline)
    current.hours = current.hours.map((row) =>
      row.dayOfWeek === 1 ? { ...row, opensAt: '08:00' } : row,
    )

    assert.equal(hasResourceDataChanges(baseline, current), true)
    assert.ok(getEditedUpdateSections(baseline, current).includes('hours'))
  })
})

describe('buildResourceUpdateComparison hours changed flag', () => {
  it('uses semantic equality when formatted closed-day text matches', () => {
    const baseline = createEmptyExistingResourceData()
    baseline.hoursAvailability = 'structured'
    baseline.hours = [
      day(0, { isClosed: true, opensAt: '09:00', closesAt: '17:00' }),
    ]
    const proposed = structuredClone(baseline)
    proposed.hours = [
      day(0, { isClosed: true, opensAt: '', closesAt: '' }),
    ]

    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const hoursField = comparison.sections
      .flatMap((section) => section.fields)
      .find((field) => field.id === 'hours:hours')

    assert.ok(hoursField)
    assert.equal(hoursField.current, hoursField.proposed)
    assert.equal(hoursField.changed, false)
  })

  it('marks hours changed on a genuine open-time difference', () => {
    const baseline = createEmptyExistingResourceData()
    baseline.hoursAvailability = 'structured'
    baseline.hours = [day(1, { opensAt: '09:00', closesAt: '17:00' })]
    const proposed = structuredClone(baseline)
    proposed.hours = [day(1, { opensAt: '10:00', closesAt: '17:00' })]

    const comparison = buildResourceUpdateComparison(baseline, proposed)
    const hoursField = comparison.sections
      .flatMap((section) => section.fields)
      .find((field) => field.id === 'hours:hours')

    assert.ok(hoursField)
    assert.equal(hoursField.changed, true)
  })
})
