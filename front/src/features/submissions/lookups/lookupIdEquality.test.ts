import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  areLookupIdSetsEquivalent,
  canonicalizeLookupIds,
} from './lookupIdEquality'

describe('canonicalizeLookupIds / areLookupIdSetsEquivalent', () => {
  it('treats empty lists as equal', () => {
    assert.equal(areLookupIdSetsEquivalent([], []), true)
  })

  it('treats identical single ids as equal', () => {
    assert.equal(areLookupIdSetsEquivalent([1], [1]), true)
  })

  it('treats same ids in different order as equal', () => {
    assert.equal(areLookupIdSetsEquivalent([1, 2, 3], [3, 1, 2]), true)
    assert.deepEqual(canonicalizeLookupIds([3, 1, 2]), [1, 2, 3])
  })

  it('detects a replaced id', () => {
    assert.equal(areLookupIdSetsEquivalent([1, 2], [1, 3]), false)
  })

  it('detects an added id', () => {
    assert.equal(areLookupIdSetsEquivalent([1, 2], [1, 2, 3]), false)
  })

  it('does not collapse duplicates', () => {
    assert.equal(areLookupIdSetsEquivalent([1, 1], [1]), false)
  })

  it('does not mutate the input array', () => {
    const input = [3, 1, 2]
    const before = [...input]
    canonicalizeLookupIds(input)
    assert.deepEqual(input, before)
  })
})
