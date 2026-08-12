import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  NEW_RESOURCE_SUBMISSION_FILTERS,
  RESOURCE_UPDATE_FILTERS,
  areReviewContributionFiltersEqual,
  parseReviewQueueFiltersFromSearchParams,
  resolveReviewQueueFiltersFromSearchParams,
  reviewSubmissionsUrl,
} from '@/features/staff/submissions/reviewQueueNavigation'

describe('parseReviewQueueFiltersFromSearchParams', () => {
  it('parses a single valid type', () => {
    const params = new URLSearchParams('types=resource_update')
    assert.deepEqual(parseReviewQueueFiltersFromSearchParams(params), [
      'resource_update',
    ])
  })

  it('parses multiple valid types', () => {
    const params = new URLSearchParams(
      'types=existing_resource,event,skill',
    )
    assert.deepEqual(parseReviewQueueFiltersFromSearchParams(params), [
      'existing_resource',
      'event',
      'skill',
    ])
  })

  it('returns null when types is missing', () => {
    assert.equal(
      parseReviewQueueFiltersFromSearchParams(new URLSearchParams()),
      null,
    )
  })

  it('returns null when types is empty', () => {
    assert.equal(
      parseReviewQueueFiltersFromSearchParams(new URLSearchParams('types=')),
      null,
    )
    assert.equal(
      parseReviewQueueFiltersFromSearchParams(new URLSearchParams('types=  ')),
      null,
    )
  })

  it('returns null when types is entirely invalid', () => {
    assert.equal(
      parseReviewQueueFiltersFromSearchParams(
        new URLSearchParams('types=new_resource'),
      ),
      null,
    )
  })

  it('keeps only the valid subset for mixed values', () => {
    assert.deepEqual(
      parseReviewQueueFiltersFromSearchParams(
        new URLSearchParams('types=new_resource,event,bogus'),
      ),
      ['event'],
    )
  })
})

describe('resolveReviewQueueFiltersFromSearchParams', () => {
  it('maps missing/invalid types to all-kinds ([] )', () => {
    assert.deepEqual(
      resolveReviewQueueFiltersFromSearchParams(new URLSearchParams()),
      [],
    )
    assert.deepEqual(
      resolveReviewQueueFiltersFromSearchParams(new URLSearchParams('types=')),
      [],
    )
    assert.deepEqual(
      resolveReviewQueueFiltersFromSearchParams(
        new URLSearchParams('types=new_resource'),
      ),
      [],
    )
  })

  it('applies valid deep-link filters', () => {
    assert.deepEqual(
      resolveReviewQueueFiltersFromSearchParams(
        new URLSearchParams(
          `types=${NEW_RESOURCE_SUBMISSION_FILTERS.join(',')}`,
        ),
      ),
      [...NEW_RESOURCE_SUBMISSION_FILTERS],
    )
    assert.deepEqual(
      resolveReviewQueueFiltersFromSearchParams(
        new URLSearchParams(`types=${RESOURCE_UPDATE_FILTERS.join(',')}`),
      ),
      [...RESOURCE_UPDATE_FILTERS],
    )
  })

  it('clears effective filters when types is removed after a valid deep link', () => {
    const applied = resolveReviewQueueFiltersFromSearchParams(
      new URLSearchParams('types=resource_update'),
    )
    assert.deepEqual(applied, ['resource_update'])

    const afterBareNavigation = resolveReviewQueueFiltersFromSearchParams(
      new URLSearchParams(),
    )
    assert.deepEqual(afterBareNavigation, [])
    assert.equal(
      areReviewContributionFiltersEqual(applied, afterBareNavigation),
      false,
    )
  })
})

describe('areReviewContributionFiltersEqual', () => {
  it('compares filter sets without regard to order', () => {
    assert.equal(
      areReviewContributionFiltersEqual(
        ['event', 'skill'],
        ['skill', 'event'],
      ),
      true,
    )
    assert.equal(
      areReviewContributionFiltersEqual(['event'], ['skill']),
      false,
    )
  })
})

describe('reviewSubmissionsUrl', () => {
  it('omits types for the all-kinds view', () => {
    assert.equal(reviewSubmissionsUrl([]), '/staff/submissions')
  })

  it('encodes dashboard KPI deep links', () => {
    assert.equal(
      reviewSubmissionsUrl(RESOURCE_UPDATE_FILTERS),
      '/staff/submissions?types=resource_update',
    )
  })
})
