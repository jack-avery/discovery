import { useEffect, useState } from 'react'
import type { ResourceMapItem } from '@/types'
import { fetchMapResources } from '@/services/resources/mapService'

interface UseResourceMapResult {
  items: ResourceMapItem[]
  isLoading: boolean
  error: string | null
}

export function useResourceMap(): UseResourceMapResult {
  const [items, setItems] = useState<ResourceMapItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchMapResources()
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load map resources')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { items, isLoading, error }
}
