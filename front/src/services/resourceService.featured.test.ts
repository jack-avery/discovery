import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Resource, ResourceDetail } from '@/types/resource'
import {
  EMPTY_PAGINATION,
  featuredPageCount,
  fetchFeaturedResources,
  mergeFeaturedSummaries,
  pickRandomFeaturedPage,
  type FetchFeaturedResourcesDeps,
  type ResourceListResult,
} from '@/services/resourceService'

function summary(id: number, name = `Resource ${id}`): Resource {
  return {
    id: String(id),
    resource_id: id,
    slug: `resource-${id}`,
    name,
    is_active: true,
    last_verified_at: null,
    resource_type: 'organization',
    image_url: null,
  }
}

function listResult(
  resources: Resource[],
  pagination: Partial<ResourceListResult['pagination']> = {},
): ResourceListResult {
  return {
    resources,
    pagination: { ...EMPTY_PAGINATION, ...pagination },
    limitations: [],
  }
}

function detail(id: number): ResourceDetail {
  return {
    resource_id: id,
    slug: `resource-${id}`,
    version: {
      resource_version_id: id,
      resource_type: 'organization',
      moderation_status: 'approved',
      name: `Resource ${id}`,
      description: `Description for ${id}`,
      eligibility: null,
      cost_description: null,
      accessibility_notes: null,
      general_notes: null,
      image_url: null,
      submitted_at: null,
      approved_at: null,
      expires_at: null,
      categories: [{ category_id: 1, name: 'Health', is_primary: true }],
      tags: [{ tag_id: 2, name: 'Youth' }],
      locations: [],
      contacts: [],
      hours: [],
    },
  }
}

type ListCall = { page?: number; perPage?: number }

function createListMock(handlers: {
  onProbe?: (query: ListCall) => ResourceListResult
  onPage?: (query: ListCall) => ResourceListResult
}): {
  listResources: NonNullable<FetchFeaturedResourcesDeps['listResources']>
  calls: ListCall[]
} {
  const calls: ListCall[] = []
  const listResources: NonNullable<FetchFeaturedResourcesDeps['listResources']> = async (
    query = {},
  ) => {
    const call: ListCall = { page: query.page, perPage: query.perPage }
    calls.push(call)
    if (query.perPage === 1) {
      assert.ok(handlers.onProbe, 'unexpected probe call')
      return handlers.onProbe(call)
    }
    assert.ok(handlers.onPage, 'unexpected page call')
    return handlers.onPage(call)
  }
  return { listResources, calls }
}

describe('featuredPageCount', () => {
  it('returns 0 for empty catalogs', () => {
    assert.equal(featuredPageCount(0), 0)
    assert.equal(featuredPageCount(-1), 0)
  })

  it('computes pages for per_page=9 without loading every row', () => {
    assert.equal(featuredPageCount(1), 1)
    assert.equal(featuredPageCount(9), 1)
    assert.equal(featuredPageCount(10), 2)
    assert.equal(featuredPageCount(27), 3)
    assert.equal(featuredPageCount(20000), 2223)
  })
})

describe('pickRandomFeaturedPage', () => {
  it('selects a valid page in range', () => {
    assert.equal(pickRandomFeaturedPage(5, () => 0), 1)
    assert.equal(pickRandomFeaturedPage(5, () => 0.999), 5)
    assert.equal(pickRandomFeaturedPage(3, () => 0.5), 2)
  })

  it('defaults to page 1 when there are no pages', () => {
    assert.equal(pickRandomFeaturedPage(0, () => 0.5), 1)
  })
})

describe('mergeFeaturedSummaries', () => {
  it('fills remaining slots from another page without duplicates', () => {
    const primary = [summary(19), summary(20)]
    const fill = [summary(1), summary(2), summary(19), summary(3)]
    const merged = mergeFeaturedSummaries(primary, fill, 5)
    assert.deepEqual(
      merged.map((r) => r.id),
      ['19', '20', '1', '2', '3'],
    )
  })

  it('never exceeds the limit', () => {
    const merged = mergeFeaturedSummaries(
      [summary(1), summary(2)],
      [summary(3), summary(4), summary(5)],
      4,
    )
    assert.equal(merged.length, 4)
  })
})

describe('fetchFeaturedResources', () => {
  it('obtains total metadata with a lightweight probe, not the full dataset', async () => {
    const { listResources, calls } = createListMock({
      onProbe: () =>
        listResult([summary(1)], {
          page: 1,
          per_page: 1,
          total_items: 25,
          total_pages: 25,
        }),
      onPage: ({ page }) => {
        assert.equal(page, 2)
        return listResult(
          Array.from({ length: 9 }, (_, i) => summary(10 + i)),
          { page: 2, per_page: 9, total_items: 25, total_pages: 3 },
        )
      },
    })

    const detailsRequested: string[] = []
    const cards = await fetchFeaturedResources(
      {},
      {
        listResources,
        getResourceById: async (id) => {
          detailsRequested.push(String(id))
          return detail(Number(id))
        },
        random: () => 0.4, // page 2 of 3
      },
    )

    assert.equal(calls[0]?.perPage, 1)
    assert.equal(calls[0]?.page, 1)
    assert.ok(calls.every((c) => (c.perPage ?? 0) <= 9))
    assert.equal(calls.filter((c) => c.perPage === 9).length, 1)
    assert.equal(cards.length, 9)
    assert.equal(detailsRequested.length, 9)
    assert.ok(cards.every((c) => c.description.includes('Description')))
    assert.ok(cards[0]?.labels.includes('Health'))
  })

  it('selects a valid random page from the computed range', async () => {
    const pages: number[] = []
    const { listResources } = createListMock({
      onProbe: () =>
        listResult([summary(1)], { total_items: 30, total_pages: 30 }),
      onPage: ({ page }) => {
        pages.push(page ?? -1)
        return listResult(
          Array.from({ length: 9 }, (_, i) => summary((page! - 1) * 9 + i + 1)),
          { page, per_page: 9, total_items: 30, total_pages: 4 },
        )
      },
    })

    await fetchFeaturedResources(
      {},
      {
        listResources,
        getResourceById: async (id) => detail(Number(id)),
        random: () => 0.99, // last of 4 pages
      },
    )

    assert.deepEqual(pages, [4])
  })

  it('returns at most 9 hydrated resources', async () => {
    const { listResources } = createListMock({
      onProbe: () =>
        listResult([summary(1)], { total_items: 100, total_pages: 100 }),
      onPage: () =>
        listResult(
          Array.from({ length: 9 }, (_, i) => summary(i + 1)),
          { total_items: 100, total_pages: 12 },
        ),
    })

    const cards = await fetchFeaturedResources(
      {},
      {
        listResources,
        getResourceById: async (id) => detail(Number(id)),
        random: () => 0,
      },
    )

    assert.equal(cards.length, 9)
  })

  it('fills a short final page from another page without duplicates', async () => {
    const { listResources, calls } = createListMock({
      onProbe: () =>
        listResult([summary(1)], { total_items: 11, total_pages: 11 }),
      onPage: ({ page }) => {
        if (page === 2) {
          return listResult([summary(10), summary(11)], {
            page: 2,
            per_page: 9,
            total_items: 11,
            total_pages: 2,
          })
        }
        return listResult(
          Array.from({ length: 9 }, (_, i) => summary(i + 1)),
          { page: 1, per_page: 9, total_items: 11, total_pages: 2 },
        )
      },
    })

    const cards = await fetchFeaturedResources(
      {},
      {
        listResources,
        getResourceById: async (id) => detail(Number(id)),
        random: () => 0.9, // page 2 of 2 (partial)
      },
    )

    assert.equal(calls.filter((c) => c.perPage === 9).length, 2)
    assert.equal(cards.length, 9)
    const ids = cards.map((c) => c.id)
    assert.deepEqual(ids.slice(0, 2), ['10', '11'])
    assert.equal(new Set(ids).size, 9)
  })

  it('returns all resources when fewer than 9 are published', async () => {
    const { listResources, calls } = createListMock({
      onProbe: () =>
        listResult([summary(1)], { total_items: 4, total_pages: 4 }),
      onPage: () =>
        listResult([summary(1), summary(2), summary(3), summary(4)], {
          page: 1,
          per_page: 9,
          total_items: 4,
          total_pages: 1,
        }),
    })

    const cards = await fetchFeaturedResources(
      {},
      {
        listResources,
        getResourceById: async (id) => detail(Number(id)),
        random: () => 0.5,
      },
    )

    assert.equal(cards.length, 4)
    assert.equal(calls.filter((c) => c.perPage === 9).length, 1)
  })

  it('returns an empty list when zero published resources exist', async () => {
    const { listResources, calls } = createListMock({
      onProbe: () =>
        listResult([], {
          page: 1,
          per_page: 1,
          total_items: 0,
          total_pages: 0,
        }),
    })

    const cards = await fetchFeaturedResources(
      {},
      {
        listResources,
        getResourceById: async () => {
          throw new Error('detail should not be called')
        },
        random: () => 0,
      },
    )

    assert.deepEqual(cards, [])
    assert.equal(calls.length, 1)
    assert.equal(calls[0]?.perPage, 1)
  })

  it('skips failed detail hydration without failing the whole showcase', async () => {
    const { listResources } = createListMock({
      onProbe: () =>
        listResult([summary(1)], { total_items: 3, total_pages: 3 }),
      onPage: () =>
        listResult([summary(1), summary(2), summary(3)], {
          total_items: 3,
          total_pages: 1,
        }),
    })

    const cards = await fetchFeaturedResources(
      {},
      {
        listResources,
        getResourceById: async (id) => {
          if (String(id) === '2') throw new Error('boom')
          return detail(Number(id))
        },
        random: () => 0,
      },
    )

    assert.deepEqual(
      cards.map((c) => c.id),
      ['1', '3'],
    )
  })

  it('is a one-shot fetch — calling it once performs the only resource loads', async () => {
    let listInvocations = 0
    let detailInvocations = 0
    const { listResources } = createListMock({
      onProbe: () => {
        listInvocations += 1
        return listResult([summary(1)], { total_items: 9, total_pages: 9 })
      },
      onPage: () => {
        listInvocations += 1
        return listResult(
          Array.from({ length: 9 }, (_, i) => summary(i + 1)),
          { total_items: 9, total_pages: 1 },
        )
      },
    })

    await fetchFeaturedResources(
      {},
      {
        listResources,
        getResourceById: async (id) => {
          detailInvocations += 1
          return detail(Number(id))
        },
        random: () => 0,
      },
    )

    assert.equal(listInvocations, 2)
    assert.equal(detailInvocations, 9)
    // Carousel prev/next/dots/auto-rotate must use in-memory results only;
    // useFeaturedResources mounts with empty deps and must not re-call this.
  })

  it('propagates list probe failures', async () => {
    await assert.rejects(
      () =>
        fetchFeaturedResources(
          {},
          {
            listResources: async () => {
              throw new Error('network down')
            },
          },
        ),
      /network down/,
    )
  })
})
