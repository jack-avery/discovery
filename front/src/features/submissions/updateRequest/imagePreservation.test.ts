import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ResourceVersionDto } from '@/types/resource'
import {
  createEmptyExistingResourceData,
  normalizeExistingResourceData,
} from '@/features/submissions/existingResource/emptyState'
import { createEmptyContributorInfo } from '@/features/submissions/contributor/emptyState'
import { mapUpdateResourceRequest } from '@/features/submissions/mappers/mapExistingResource'
import { mapResourceVersionToExistingResourceData } from './mapResourceVersionToExistingResourceData'
import { getEditedUpdateSections } from './updateSectionDiff'

function resourceVersion(imageUrl: string | null): ResourceVersionDto {
  return {
    resource_version_id: 1,
    resource_type: 'Organization',
    moderation_status: 'approved',
    name: 'Community Resource',
    description: 'A community resource.',
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

describe('Update Resource image preservation', () => {
  it('copies the published image into update prefill data', () => {
    const data = mapResourceVersionToExistingResourceData(
      resourceVersion('/uploads/resources/existing.jpg'),
    )

    assert.equal(data.imageUrl, '/uploads/resources/existing.jpg')
  })

  it('preserves the existing image when an unrelated field changes', () => {
    const data = mapResourceVersionToExistingResourceData(
      resourceVersion('/uploads/resources/existing.jpg'),
    )
    data.contacts = [
      {
        id: 'phone-1',
        type: 'phone',
        value: '613-555-0100',
        label: '',
      },
    ]

    const payload = mapUpdateResourceRequest(
      1,
      data,
      createEmptyContributorInfo(),
    )

    assert.equal(payload.image_url, '/uploads/resources/existing.jpg')
  })

  it('keeps a missing published image null and omits it from the DTO', () => {
    const data = mapResourceVersionToExistingResourceData(resourceVersion(null))
    const payload = mapUpdateResourceRequest(
      1,
      data,
      createEmptyContributorInfo(),
    )

    assert.equal(data.imageUrl, null)
    assert.equal(payload.image_url, undefined)
    assert.equal(
      Object.prototype.hasOwnProperty.call(payload, 'image_url'),
      false,
    )
  })

  it('does not report an unchanged image as an update', () => {
    const baseline = createEmptyExistingResourceData()
    baseline.imageUrl = '/uploads/resources/existing.jpg'
    const current = { ...baseline }

    assert.deepEqual(getEditedUpdateSections(baseline, current), [])
  })

  it('reports a changed image as an About update', () => {
    const baseline = createEmptyExistingResourceData()
    baseline.imageUrl = '/uploads/resources/existing.jpg'
    const current = {
      ...baseline,
      imageUrl: '/uploads/resources/replacement.jpg',
    }

    assert.deepEqual(getEditedUpdateSections(baseline, current), ['about'])
  })

  it('normalizes legacy Existing Resource data without imageUrl to null', () => {
    const { imageUrl: _imageUrl, ...legacy } =
      createEmptyExistingResourceData()
    const normalized = normalizeExistingResourceData(legacy)

    assert.equal(normalized.imageUrl, null)
  })
})
