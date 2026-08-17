import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveResourceImageUrl } from '@/utils/resolveResourceImageUrl'

describe('resolveResourceImageUrl', () => {
  it('returns null for missing or empty values', () => {
    assert.equal(resolveResourceImageUrl(null, '/api/v1'), null)
    assert.equal(resolveResourceImageUrl(undefined, '/api/v1'), null)
    assert.equal(resolveResourceImageUrl('  ', '/api/v1'), null)
  })

  it('preserves absolute HTTP and HTTPS URLs', () => {
    assert.equal(
      resolveResourceImageUrl(
        'https://images.example.org/resource.jpg',
        '/api/v1',
      ),
      'https://images.example.org/resource.jpg',
    )
    assert.equal(
      resolveResourceImageUrl('http://localhost:5000/image.jpg', '/api/v1'),
      'http://localhost:5000/image.jpg',
    )
  })

  it('resolves uploaded image paths through a production API prefix', () => {
    assert.equal(
      resolveResourceImageUrl('/uploads/resources/image.jpg', '/api/v1'),
      '/api/v1/uploads/resources/image.jpg',
    )
  })

  it('resolves uploaded image paths through a local API origin', () => {
    assert.equal(
      resolveResourceImageUrl(
        '/uploads/resources/image.jpg',
        'http://localhost:5000',
      ),
      'http://localhost:5000/uploads/resources/image.jpg',
    )
  })

  it('normalizes slashes between the API base and image path', () => {
    assert.equal(
      resolveResourceImageUrl('uploads/resources/image.jpg', '/api/v1/'),
      '/api/v1/uploads/resources/image.jpg',
    )
  })

  it('rejects non-HTTP URL schemes', () => {
    assert.equal(resolveResourceImageUrl('javascript:alert(1)', '/api/v1'), null)
    assert.equal(
      resolveResourceImageUrl('//example.org/image.jpg', '/api/v1'),
      null,
    )
  })
})
