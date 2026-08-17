import {
  ApiError,
  API_URL,
  buildUrl,
  isApiSuccessEnvelope,
  isRecord,
  readJsonBody,
  throwHttpError,
} from '@/services/apiBase'
import { toUserFacingErrorMessage } from '@/utils/userFacingError'

export const MAX_RESOURCE_IMAGE_BYTES = 5 * 1024 * 1024

const ACCEPTED_IMAGE_TYPES = new Map([
  ['image/jpeg', new Set(['jpg', 'jpeg'])],
  ['image/png', new Set(['png'])],
  ['image/webp', new Set(['webp'])],
])

export const RESOURCE_IMAGE_ACCEPT =
  'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

export type ResourceImageFile = Pick<File, 'name' | 'size' | 'type'>

/** UX guard only; the backend remains authoritative for upload validation. */
export function validateResourceImageFile(
  file: ResourceImageFile,
): string | null {
  if (file.size <= 0) {
    return 'Choose a non-empty JPEG, PNG, or WebP image.'
  }
  if (file.size > MAX_RESOURCE_IMAGE_BYTES) {
    return 'Choose an image that is 5 MB or smaller.'
  }

  const allowedExtensions = ACCEPTED_IMAGE_TYPES.get(file.type.toLowerCase())
  if (!allowedExtensions) {
    return 'Choose a JPEG, PNG, or WebP image.'
  }

  const extension = file.name.includes('.')
    ? file.name.split('.').pop()?.toLowerCase()
    : undefined
  if (!extension || !allowedExtensions.has(extension)) {
    return 'The file extension does not match the selected image type.'
  }

  return null
}

interface UploadResourceImageResponse {
  image_url: string
}

export interface UploadResourceImageOptions {
  signal?: AbortSignal
}

export async function uploadResourceImage(
  file: File,
  options: UploadResourceImageOptions = {},
): Promise<string> {
  const validationError = validateResourceImageFile(file)
  if (validationError) {
    throw new Error(validationError)
  }
  if (!API_URL) {
    throw new ApiError(
      'VITE_API_URL is not configured. Set an absolute origin (e.g. http://localhost:5000) or a relative prefix (e.g. /api/v1).',
      0,
    )
  }

  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(buildUrl('/uploads/resources'), {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
    body: formData,
    signal: options.signal,
  })
  const payload = await readJsonBody(response)

  if (!response.ok) {
    throwHttpError(response, payload)
  }

  return parseResourceImageUploadResponse(payload, response.status)
}

export function parseResourceImageUploadResponse(
  payload: unknown,
  status = 201,
): string {
  if (
    !isApiSuccessEnvelope<UploadResourceImageResponse>(payload) ||
    !isRecord(payload.data) ||
    typeof payload.data.image_url !== 'string' ||
    !payload.data.image_url.trim()
  ) {
    throw new ApiError(
      'Unexpected API response: missing uploaded image URL.',
      status,
      { body: payload },
    )
  }

  return payload.data.image_url.trim()
}

export function toResourceImageUploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'The image could not be uploaded. Choose the file again.'
    }
    if (error.status === 413) {
      return 'Choose an image that is 5 MB or smaller.'
    }
    if (error.status === 422) {
      return 'Choose a valid JPEG, PNG, or WebP image.'
    }
    if (error.status === 429) {
      return 'Too many image uploads. Please try again later.'
    }
  }

  return toUserFacingErrorMessage(error, {
    fallback: 'Unable to upload the image. Please try again.',
    context: 'upload-resource-image',
    allowSafeApiMessage: true,
  })
}
