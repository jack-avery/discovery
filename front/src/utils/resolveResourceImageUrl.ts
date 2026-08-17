import {
  API_URL,
  isAbsoluteHttpUrl,
  joinApiPath,
  normalizeApiBaseUrl,
} from '@/services/apiBase'

export function resolveResourceImageUrl(
  imageUrl: string | null | undefined,
  apiBaseUrl = API_URL,
): string | null {
  const value = imageUrl?.trim() ?? ''
  if (!value) return null
  if (isAbsoluteHttpUrl(value)) return value
  if (value.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(value)) return null

  return joinApiPath(normalizeApiBaseUrl(apiBaseUrl), value)
}
