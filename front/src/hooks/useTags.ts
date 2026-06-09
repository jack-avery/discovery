import { useEffect, useState } from 'react'
import type { Tag } from '@/types'
import { fetchTags } from '@/features/resources/catalog'

interface UseTagsResult {
  tags: Tag[]
  isLoading: boolean
  error: string | null
}

export function useTags(): UseTagsResult {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchTags()
      .then((data) => {
        if (!cancelled) setTags(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tags')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { tags, isLoading, error }
}
