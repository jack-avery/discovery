import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { DayHours, ExistingResourceData } from '@/types/submission'
import {
  createContactMethod,
  createDefaultHours,
  createEmptyExistingResourceData,
} from '@/features/submissions/existingResource/emptyState'
import {
  isExistingResourceComplete,
  validateSectionAccess,
} from '@/features/submissions/existingResource/validation'

const PAIR_ERROR = 'Enter both opening and closing times, or clear both.'
const ORDER_ERROR =
  'Opening time must be earlier than closing time for each open day.'

function day(
  dayOfWeek: number,
  partial: Partial<DayHours> = {},
): DayHours {
  return {
    dayOfWeek,
    isClosed: false,
    opensAt: '',
    closesAt: '',
    byAppointment: false,
    ...partial,
  }
}

/** Minimal online resource so access/hours validation is the focus. */
function structuredResource(hours: DayHours[]): ExistingResourceData {
  const data = createEmptyExistingResourceData()
  data.name = 'Hours Test Resource'
  data.description = 'Description'
  data.categoryIds = [1]
  data.accessMode = 'online'
  data.onlineUrl = 'https://example.org'
  data.contacts = [
    createContactMethod({
      id: 'phone-1',
      type: 'phone',
      value: '(613) 555-0100',
    }),
  ]
  data.hoursAvailability = 'structured'
  data.hours = hours
  return data
}

function hoursError(hours: DayHours[]): string | undefined {
  return validateSectionAccess(structuredResource(hours)).hours
}

describe('structured hours paired-time validation', () => {
  it('allows both blank on an open day', () => {
    assert.equal(hoursError([day(1)]), undefined)
  })

  it('rejects opening time only', () => {
    assert.equal(hoursError([day(1, { opensAt: '09:00' })]), PAIR_ERROR)
  })

  it('rejects closing time only', () => {
    assert.equal(hoursError([day(1, { closesAt: '17:00' })]), PAIR_ERROR)
  })

  it('allows a valid 09:00–17:00 pair', () => {
    assert.equal(
      hoursError([day(1, { opensAt: '09:00', closesAt: '17:00' })]),
      undefined,
    )
  })

  it('rejects reverse pairs with the existing ordering error', () => {
    assert.equal(
      hoursError([day(1, { opensAt: '17:00', closesAt: '09:00' })]),
      ORDER_ERROR,
    )
  })

  it('rejects equal open/close with the existing ordering error', () => {
    assert.equal(
      hoursError([day(1, { opensAt: '09:00', closesAt: '09:00' })]),
      ORDER_ERROR,
    )
  })

  it('allows closed days with blank times', () => {
    assert.equal(
      hoursError([day(0, { isClosed: true, opensAt: '', closesAt: '' })]),
      undefined,
    )
  })

  it('allows by-appointment days with blank times', () => {
    assert.equal(
      hoursError([
        day(2, { byAppointment: true, opensAt: '', closesAt: '' }),
      ]),
      undefined,
    )
  })

  it('rejects a schedule when one day has an incomplete pair', () => {
    assert.equal(
      hoursError([
        day(1, { opensAt: '09:00', closesAt: '17:00' }),
        day(2, { opensAt: '09:00', closesAt: '' }),
        day(3, { opensAt: '10:00', closesAt: '16:00' }),
      ]),
      PAIR_ERROR,
    )
  })

  it('allows a completely valid multi-day schedule', () => {
    assert.equal(
      hoursError([
        day(0, { isClosed: true }),
        day(1, { opensAt: '09:00', closesAt: '17:00' }),
        day(2, { opensAt: '09:00', closesAt: '17:00' }),
        day(3, { byAppointment: true }),
        day(4, { opensAt: '10:00', closesAt: '16:00' }),
        day(5, { opensAt: '', closesAt: '' }),
        day(6, { isClosed: true }),
      ]),
      undefined,
    )
  })

  it('marks the resource incomplete for an incomplete pair', () => {
    const data = structuredResource([day(1, { opensAt: '09:00' })])
    assert.equal(isExistingResourceComplete(data), false)
  })

  it('restores completeness when both times are cleared', () => {
    const data = structuredResource([day(1, { opensAt: '09:00' })])
    assert.equal(isExistingResourceComplete(data), false)

    data.hours = [day(1, { opensAt: '', closesAt: '' })]
    assert.equal(hoursError(data.hours), undefined)
    assert.equal(isExistingResourceComplete(data), true)
  })

  it('keeps createDefaultHours() valid under structured mode', () => {
    assert.equal(hoursError(createDefaultHours()), undefined)
  })
})
