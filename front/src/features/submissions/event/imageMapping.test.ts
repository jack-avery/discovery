import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ResourceVersionDto } from '@/types/resource'
import { mapEventVersionToEventContributionData } from '@/features/staff/submissions/eventReview/mapEventVersionToEventContributionData'
import { createEmptyContribution } from '../constants/contributionTypes'
import { createEmptyContributorInfo } from '../contributor/emptyState'
import { mapEventContribution } from '../mappers/mapEvent'
import {
  createEmptyEventData,
  normalizeEventContributionData,
} from './emptyState'

function eventVersion(imageUrl: string | null): ResourceVersionDto {
  return {
    resource_version_id: 1,
    resource_type: 'Program',
    moderation_status: 'pending_review',
    name: 'Community Event',
    description: 'A community event.',
    eligibility: null,
    cost_description: null,
    accessibility_notes: null,
    general_notes: null,
    image_url: imageUrl,
    submitted_at: null,
    approved_at: null,
    expires_at: null,
    categories: [],
    tags: [],
    locations: [],
    contacts: [],
    hours: [],
  }
}

describe('Event image data', () => {
  it('defaults imageUrl to null', () => {
    assert.equal(createEmptyEventData().imageUrl, null)
  })

  it('normalizes legacy Event data without imageUrl to null', () => {
    const { imageUrl: _imageUrl, ...legacy } = createEmptyEventData()

    assert.equal(normalizeEventContributionData(legacy).imageUrl, null)
  })

  it('omits image_url when no image was uploaded', () => {
    const contribution = createEmptyContribution('event')
    contribution.data = {
      ...createEmptyEventData(),
      name: 'Community Event',
    }

    const payload = mapEventContribution(
      contribution,
      createEmptyContributorInfo(),
    )

    assert.equal(payload.image_url, undefined)
    assert.equal(
      Object.prototype.hasOwnProperty.call(payload, 'image_url'),
      false,
    )
  })

  it('maps the uploaded image URL exactly', () => {
    const contribution = createEmptyContribution('event')
    contribution.data = {
      ...createEmptyEventData(),
      name: 'Community Event',
      imageUrl: '/uploads/resources/community-event.webp',
    }

    const payload = mapEventContribution(
      contribution,
      createEmptyContributorInfo(),
    )

    assert.equal(
      payload.image_url,
      '/uploads/resources/community-event.webp',
    )
  })
})

describe('Event staff review image mapping', () => {
  it('preserves a proposed Event image URL', () => {
    const data = mapEventVersionToEventContributionData(
      eventVersion('/uploads/resources/community-event.webp'),
    )

    assert.equal(data.imageUrl, '/uploads/resources/community-event.webp')
  })

  it('keeps a missing proposed Event image null', () => {
    const data = mapEventVersionToEventContributionData(eventVersion(null))

    assert.equal(data.imageUrl, null)
  })
})
