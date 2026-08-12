import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildUrl } from '@/services/apiBase'
import { buildMapQueryParams } from '@/services/mapService'
import { buildResourceListParams } from '@/services/resourceService'

function tagIdsFromParams(
  params: Record<string, unknown>,
): number[] | number | undefined {
  return params.tag_id as number[] | number | undefined
}

function categoryIdsFromParams(
  params: Record<string, unknown>,
): number[] | number | undefined {
  return params.category_id as number[] | number | undefined
}

describe('buildResourceListParams multi-tag', () => {
  it('omits tag_id when no tags are selected', () => {
    const { params, limitations } = buildResourceListParams({ tagIds: [] })
    assert.equal(params.tag_id, undefined)
    assert.deepEqual(limitations, [])
  })

  it('sends a scalar tag_id for one tag', () => {
    const { params, limitations } = buildResourceListParams({ tagIds: [1] })
    assert.equal(params.tag_id, 1)
    assert.deepEqual(limitations, [])
  })

  it('sends both tag ids for two selected tags (regression)', () => {
    const { params, limitations } = buildResourceListParams({
      tagIds: [1, 2],
    })
    assert.deepEqual(tagIdsFromParams(params), [1, 2])
    assert.deepEqual(limitations, [])
    assert.equal(
      Object.values(limitations).some(
        (item) =>
          typeof item === 'object' &&
          item != null &&
          'code' in item &&
          (item as { code: string }).code === 'MULTI_TAG_UNSUPPORTED',
      ),
      false,
    )
  })

  it('sends all three tag ids for three selected tags', () => {
    const { params } = buildResourceListParams({ tagIds: [1, 2, 3] })
    assert.deepEqual(tagIdsFromParams(params), [1, 2, 3])
  })

  it('preserves multiple categories and multiple tags together', () => {
    const { params, limitations } = buildResourceListParams({
      categoryIds: [10, 20],
      tagIds: [1, 2],
    })
    assert.deepEqual(categoryIdsFromParams(params), [10, 20])
    assert.deepEqual(tagIdsFromParams(params), [1, 2])
    assert.deepEqual(limitations, [])
  })

  it('serializes multiple tags as repeated tag_id query keys', () => {
    const { params } = buildResourceListParams({ tagIds: [1, 2] })
    const url = buildUrl('/resources', params)
    const search = new URL(url, 'http://localhost').searchParams
    assert.deepEqual(search.getAll('tag_id'), ['1', '2'])
    assert.equal(search.get('tag_id')?.includes(','), false)
  })
})

describe('buildMapQueryParams multi-tag', () => {
  const base = { lat: 45.4, lng: -75.6 }

  it('omits tag_id when no tags are selected', () => {
    const { params, limitations } = buildMapQueryParams({
      ...base,
      tagIds: [],
    })
    assert.equal(params.tag_id, undefined)
    assert.equal(
      limitations.some((item) => item.code === 'RADIUS_APPROXIMATES_VIEWPORT'),
      false,
    )
  })

  it('sends a scalar tag_id for one tag', () => {
    const { params } = buildMapQueryParams({ ...base, tagIds: [1] })
    assert.equal(params.tag_id, 1)
  })

  it('sends both tag ids for two selected tags (regression)', () => {
    const { params, limitations } = buildMapQueryParams({
      ...base,
      tagIds: [1, 2],
    })
    assert.deepEqual(tagIdsFromParams(params), [1, 2])
    assert.equal(
      limitations.some(
        (item) => (item as { code?: string }).code === 'MULTI_TAG_UNSUPPORTED',
      ),
      false,
    )
  })

  it('sends all three tag ids for three selected tags', () => {
    const { params } = buildMapQueryParams({ ...base, tagIds: [1, 2, 3] })
    assert.deepEqual(tagIdsFromParams(params), [1, 2, 3])
  })

  it('preserves multiple categories and multiple tags together', () => {
    const { params } = buildMapQueryParams({
      ...base,
      categoryIds: [10, 20],
      tagIds: [1, 2],
    })
    assert.deepEqual(categoryIdsFromParams(params), [10, 20])
    assert.deepEqual(tagIdsFromParams(params), [1, 2])
  })

  it('serializes multiple tags as repeated tag_id query keys', () => {
    const { params } = buildMapQueryParams({ ...base, tagIds: [1, 2] })
    const url = buildUrl('/resources/map', params)
    const search = new URL(url, 'http://localhost').searchParams
    assert.deepEqual(search.getAll('tag_id'), ['1', '2'])
  })

  it('keeps list and map tag params equivalent for the same selection', () => {
    const tagIds = [7, 8, 9]
    const categoryIds = [3, 4]
    const list = buildResourceListParams({ tagIds, categoryIds })
    const map = buildMapQueryParams({ ...base, tagIds, categoryIds })
    assert.deepEqual(list.params.tag_id, map.params.tag_id)
    assert.deepEqual(list.params.category_id, map.params.category_id)
  })
})
