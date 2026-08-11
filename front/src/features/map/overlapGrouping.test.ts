import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  fanPixelOffsets,
  partitionOverlapGroups,
  projectLatLngToPoint,
} from './overlapGrouping'
import type { ResourceMapItem } from '@/types'

function item(
  id: string,
  latitude: number,
  longitude: number,
): ResourceMapItem {
  return {
    id,
    slug: id,
    name: id,
    location: { latitude, longitude },
  }
}

describe('partitionOverlapGroups', () => {
  const options = { projectZoom: 18, maxPixelDistance: 1 }

  it('groups exact same coordinates and sorts members by id', () => {
    const items = [
      item('c', 45.4, -75.7),
      item('a', 45.4, -75.7),
      item('b', 45.4, -75.7),
    ]
    const { singletons, overlapGroups } = partitionOverlapGroups(items, options)
    assert.equal(singletons.length, 0)
    assert.equal(overlapGroups.length, 1)
    assert.deepEqual(
      overlapGroups[0].members.map((m) => m.id),
      ['a', 'b', 'c'],
    )
  })

  it('keeps nearby but distinct coordinates as singletons', () => {
    // ~50m apart — separable at maxZoom projection
    const items = [
      item('a', 45.4, -75.7),
      item('b', 45.4005, -75.7),
      item('c', 45.401, -75.7),
    ]
    const { singletons, overlapGroups } = partitionOverlapGroups(items, options)
    assert.equal(overlapGroups.length, 0)
    assert.deepEqual(
      singletons.map((m) => m.id),
      ['a', 'b', 'c'],
    )
  })

  it('supports multiple independent overlap groups', () => {
    const items = [
      item('a', 45.4, -75.7),
      item('b', 45.4, -75.7),
      item('d', 45.5, -75.8),
      item('e', 45.5, -75.8),
    ]
    const { singletons, overlapGroups } = partitionOverlapGroups(items, options)
    assert.equal(singletons.length, 0)
    assert.equal(overlapGroups.length, 2)
    const memberSets = overlapGroups
      .map((g) => g.members.map((m) => m.id).join(','))
      .sort()
    assert.deepEqual(memberSets, ['a,b', 'd,e'])
  })

  it('does not change member order based on input order', () => {
    const first = partitionOverlapGroups(
      [item('b', 1, 2), item('a', 1, 2)],
      options,
    )
    const second = partitionOverlapGroups(
      [item('a', 1, 2), item('b', 1, 2)],
      options,
    )
    assert.deepEqual(
      first.overlapGroups[0].members.map((m) => m.id),
      second.overlapGroups[0].members.map((m) => m.id),
    )
  })
})

describe('fanPixelOffsets', () => {
  it('places two markers left/right', () => {
    const offsets = fanPixelOffsets(2, 28)
    assert.equal(offsets.length, 2)
    assert.ok(offsets[0].x < 0)
    assert.ok(offsets[1].x > 0)
  })

  it('places three or more markers on a stable radial ring', () => {
    const three = fanPixelOffsets(3, 28)
    assert.equal(three.length, 3)
    // First point near top (angle -90°)
    assert.ok(Math.abs(three[0].x) < 1e-6)
    assert.ok(three[0].y < 0)

    const four = fanPixelOffsets(4, 28)
    assert.equal(four.length, 4)
  })

  it('does not depend on selection — pure function of count/radius', () => {
    assert.deepEqual(fanPixelOffsets(3, 20), fanPixelOffsets(3, 20))
  })
})

describe('projectLatLngToPoint', () => {
  it('maps identical coordinates to the same pixel', () => {
    const a = projectLatLngToPoint(45.4, -75.7, 18)
    const b = projectLatLngToPoint(45.4, -75.7, 18)
    assert.equal(a.x, b.x)
    assert.equal(a.y, b.y)
  })
})
