import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ApiError } from '@/services/apiBase'
import {
  MAX_RESOURCE_IMAGE_BYTES,
  parseResourceImageUploadResponse,
  toResourceImageUploadErrorMessage,
  validateResourceImageFile,
  type ResourceImageFile,
} from '@/services/resourceImageUploadService'

function imageFile(
  name: string,
  type: string,
  size = 1_024,
): ResourceImageFile {
  return { name, type, size }
}

describe('resource image validation', () => {
  it('accepts JPEG images', () => {
    assert.equal(
      validateResourceImageFile(imageFile('image.jpg', 'image/jpeg')),
      null,
    )
    assert.equal(
      validateResourceImageFile(imageFile('image.jpeg', 'image/jpeg')),
      null,
    )
  })

  it('accepts PNG images', () => {
    assert.equal(
      validateResourceImageFile(imageFile('image.png', 'image/png')),
      null,
    )
  })

  it('accepts WebP images', () => {
    assert.equal(
      validateResourceImageFile(imageFile('image.webp', 'image/webp')),
      null,
    )
  })

  it('rejects unsupported image types', () => {
    assert.match(
      validateResourceImageFile(imageFile('image.gif', 'image/gif')) ?? '',
      /JPEG, PNG, or WebP/,
    )
  })

  it('rejects images larger than 5 MiB', () => {
    assert.match(
      validateResourceImageFile(
        imageFile('image.jpg', 'image/jpeg', MAX_RESOURCE_IMAGE_BYTES + 1),
      ) ?? '',
      /5 MB or smaller/,
    )
  })

  it('accepts an image exactly at the 5 MiB boundary', () => {
    assert.equal(
      validateResourceImageFile(
        imageFile('image.jpg', 'image/jpeg', MAX_RESOURCE_IMAGE_BYTES),
      ),
      null,
    )
  })

  it('rejects an extension that does not match the MIME type', () => {
    assert.match(
      validateResourceImageFile(imageFile('image.png', 'image/jpeg')) ?? '',
      /extension does not match/,
    )
  })
})

describe('resource image upload response handling', () => {
  it('extracts image_url from the backend success envelope', () => {
    assert.equal(
      parseResourceImageUploadResponse({
        status: 'success',
        message: 'Image uploaded.',
        data: { image_url: '/uploads/resources/image.jpg' },
      }),
      '/uploads/resources/image.jpg',
    )
  })

  it('rejects a malformed success response', () => {
    assert.throws(
      () =>
        parseResourceImageUploadResponse({
          status: 'success',
          message: 'Image uploaded.',
          data: {},
        }),
      ApiError,
    )
  })

  it('provides specific messages for expected upload errors', () => {
    assert.equal(
      toResourceImageUploadErrorMessage(new ApiError('too large', 413)),
      'Choose an image that is 5 MB or smaller.',
    )
    assert.equal(
      toResourceImageUploadErrorMessage(new ApiError('rate limited', 429)),
      'Too many image uploads. Please try again later.',
    )
  })
})
