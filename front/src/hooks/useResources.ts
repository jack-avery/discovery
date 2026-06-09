import { useState } from 'react'
import type { Resource } from '@/types'

export interface ResourceFilters {
  categorySlug?: string
  tagSlugs?: string[]
  search?: string
}

interface UseResourcesResult {
  resources: Resource[]
  isLoading: boolean
  error: string | null
}

/**
 * Resource data hook — returns empty state until API integration is wired.
 *
 * To integrate the backend, replace the body with:
 *   api.get<Resource[]>('/resources', { params: filters })
 */
export function useResources(_filters: ResourceFilters = {}): UseResourcesResult {
  const [isLoading] = useState(false)
  const [error] = useState<string | null>(null)
  const [resources] = useState<Resource[]>([])

  return { resources, isLoading, error }
}
