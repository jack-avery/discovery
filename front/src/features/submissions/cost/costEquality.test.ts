import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  areCostsEquivalent,
  canonicalizeCost,
  type CostSlice,
} from './costEquality'

function cost(
  costOption: CostSlice['costOption'],
  costDetails: string,
): CostSlice {
  return { costOption, costDetails }
}

describe('canonicalizeCost / areCostsEquivalent', () => {
  it('treats identical cost as equal', () => {
    assert.equal(
      areCostsEquivalent(cost('paid', '$20'), cost('paid', '$20')),
      true,
    )
  })

  it('detects option changes', () => {
    assert.equal(
      areCostsEquivalent(cost('free', ''), cost('paid', '')),
      false,
    )
  })

  it('detects meaningful details changes', () => {
    assert.equal(
      areCostsEquivalent(cost('paid', '$20'), cost('paid', '$25')),
      false,
    )
  })

  it('treats whitespace-only details differences as equal', () => {
    assert.equal(
      areCostsEquivalent(cost('paid', '$20'), cost('paid', ' $20 ')),
      true,
    )
  })

  it('ignores stale details for free', () => {
    assert.equal(
      areCostsEquivalent(cost('free', ''), cost('free', 'stale hidden text')),
      true,
    )
    assert.deepEqual(canonicalizeCost(cost('free', 'stale')), {
      costOption: 'free',
      costDetails: '',
    })
  })

  it('ignores stale details for not_sure', () => {
    assert.equal(
      areCostsEquivalent(
        cost('not_sure', ''),
        cost('not_sure', 'old hidden value'),
      ),
      true,
    )
  })

  it('preserves details for paid, sliding_scale, donation, and other', () => {
    assert.equal(
      areCostsEquivalent(cost('paid', '$20'), cost('paid', '$20')),
      true,
    )
    assert.equal(
      areCostsEquivalent(
        cost('sliding_scale', 'by income'),
        cost('sliding_scale', 'different'),
      ),
      false,
    )
    assert.equal(
      areCostsEquivalent(
        cost('donation', 'suggested $5'),
        cost('donation', 'suggested $10'),
      ),
      false,
    )
    assert.equal(
      areCostsEquivalent(cost('other', 'custom'), cost('other', 'other custom')),
      false,
    )
  })

  it('preserves trimmed details when option is null', () => {
    assert.equal(
      areCostsEquivalent(cost(null, 'custom'), cost(null, ' custom ')),
      true,
    )
    assert.equal(
      areCostsEquivalent(cost(null, 'custom'), cost(null, 'different')),
      false,
    )
    assert.deepEqual(canonicalizeCost(cost(null, ' custom ')), {
      costOption: null,
      costDetails: 'custom',
    })
  })

  it('does not mutate the input', () => {
    const input = cost('free', 'stale')
    canonicalizeCost(input)
    assert.equal(input.costDetails, 'stale')
  })
})
