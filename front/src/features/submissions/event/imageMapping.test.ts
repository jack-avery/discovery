import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createEmptyContribution } from '../constants/contributionTypes'
import { createEmptyContributorInfo } from '../contributor/emptyState'
import { mapEventContribution } from '../mappers/mapEvent'
import {
  createEmptyEventData,
  normalizeEventContributionData,
} from './emptyState'

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
