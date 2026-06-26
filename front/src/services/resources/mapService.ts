import type { ResourceMapItem } from '@/types/resource-map'
import { mockMapItems } from './mock-map-items'

/**
 * Map data access — mock implementation for feature/map-integration.
 *
 * When API integration lands, replace the body with:
 *   api.get<ApiResponse<ResourceMapItem[]>>('/api/v1/resources/map', { params })
 */
export async function fetchMapResources(): Promise<ResourceMapItem[]> {
  return mockMapItems
}
