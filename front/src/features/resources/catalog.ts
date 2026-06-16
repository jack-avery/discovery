import type { Category, Tag } from '@/types'
import { mockCategories, mockTags } from './mock-data'

/**
 * Catalog data access layer.
 *
 * To integrate the backend, replace the mock implementations below with:
 *   return api.get<Category[]>('/categories')
 *   return api.get<Tag[]>('/tags')
 */
export async function fetchCategories(): Promise<Category[]> {
  return mockCategories
}

export async function fetchTags(): Promise<Tag[]> {
  return mockTags
}
