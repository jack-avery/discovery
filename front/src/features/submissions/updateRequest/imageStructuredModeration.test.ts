import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ExistingResourceData } from '@/types/submission'
import { createEmptyExistingResourceData } from '@/features/submissions/existingResource/emptyState'
import { buildResourceUpdateComparison } from './buildResourceUpdateComparison'
import { composeResourceUpdateFinalVersion } from './composeResourceUpdateFinalVersion'

function resource(imageUrl: string | null): ExistingResourceData {
  return {
    ...createEmptyExistingResourceData(),
    name: 'Community Resource',
    description: 'A community resource.',
    imageUrl,
  }
}

function imageField(
  baseline: ExistingResourceData,
  proposed: ExistingResourceData,
) {
  return buildResourceUpdateComparison(baseline, proposed)
    .sections.flatMap((section) => section.fields)
    .find((field) => field.id === 'about:image')
}

function composeImage(
  baseline: ExistingResourceData,
  proposed: ExistingResourceData,
  accepted: boolean,
) {
  return composeResourceUpdateFinalVersion(
    baseline,
    proposed,
    buildResourceUpdateComparison(baseline, proposed),
    { 'about:image': accepted },
    {},
  )
}

describe('Update image comparison', () => {
  it('does not mark the same image URL as changed', () => {
    const baseline = resource('/uploads/resources/a.jpg')
    const field = imageField(baseline, { ...baseline })

    assert.ok(field)
    assert.equal(field.changed, false)
  })

  it('marks a replacement image as changed', () => {
    const field = imageField(
      resource('/uploads/resources/a.jpg'),
      resource('/uploads/resources/b.jpg'),
    )

    assert.ok(field)
    assert.equal(field.changed, true)
    assert.equal(field.label, 'Image')
    assert.equal(field.current, 'Image provided')
    assert.equal(field.proposed, 'Image provided')
    assert.equal(field.reviewerEditable, false)
  })

  it('exposes both stored image URLs for a replacement', () => {
    const field = imageField(
      resource('/uploads/resources/a.jpg'),
      resource('/uploads/resources/b.jpg'),
    )

    assert.ok(field)
    assert.deepEqual(field.images, {
      current: '/uploads/resources/a.jpg',
      proposed: '/uploads/resources/b.jpg',
    })
  })

  it('marks the first image as changed', () => {
    const field = imageField(
      resource(null),
      resource('/uploads/resources/b.jpg'),
    )

    assert.ok(field)
    assert.equal(field.changed, true)
    assert.equal(field.current, 'No image')
    assert.equal(field.proposed, 'Image provided')
  })

  it('exposes a null current image URL when the first image is added', () => {
    const field = imageField(
      resource(null),
      resource('/uploads/resources/b.jpg'),
    )

    assert.ok(field)
    assert.deepEqual(field.images, {
      current: null,
      proposed: '/uploads/resources/b.jpg',
    })
  })

  it('normalizes whitespace-only stored image values to no image', () => {
    const field = imageField(resource('   '), resource('   '))

    assert.ok(field)
    assert.equal(field.changed, false)
    assert.equal(field.current, 'No image')
    assert.equal(field.proposed, 'No image')
    assert.deepEqual(field.images, { current: null, proposed: null })
  })

  it('leaves the current image URL null when no baseline is available', () => {
    const field = buildResourceUpdateComparison(
      null,
      resource('/uploads/resources/b.jpg'),
    )
      .sections.flatMap((section) => section.fields)
      .find((f) => f.id === 'about:image')

    assert.ok(field)
    assert.equal(field.currentAvailable, false)
    assert.deepEqual(field.images, {
      current: null,
      proposed: '/uploads/resources/b.jpg',
    })
  })
})

describe('Update image moderation composition', () => {
  it('keeps an accepted replacement image', () => {
    const composed = composeImage(
      resource('/uploads/resources/a.jpg'),
      resource('/uploads/resources/b.jpg'),
      true,
    )

    assert.equal(composed.data.imageUrl, '/uploads/resources/b.jpg')
    assert.equal(composed.differsFromProposed, false)
  })

  it('restores the baseline image when a replacement is rejected', () => {
    const composed = composeImage(
      resource('/uploads/resources/a.jpg'),
      resource('/uploads/resources/b.jpg'),
      false,
    )

    assert.equal(composed.data.imageUrl, '/uploads/resources/a.jpg')
    assert.equal(composed.differsFromProposed, true)
  })

  it('keeps an accepted first image', () => {
    const composed = composeImage(
      resource(null),
      resource('/uploads/resources/b.jpg'),
      true,
    )

    assert.equal(composed.data.imageUrl, '/uploads/resources/b.jpg')
  })

  it('keeps the baseline empty when a first image is rejected', () => {
    const composed = composeImage(
      resource(null),
      resource('/uploads/resources/b.jpg'),
      false,
    )

    assert.equal(composed.data.imageUrl, null)
  })
})
