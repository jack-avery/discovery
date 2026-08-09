import type { Tag } from '@/types'
import { fetchTags } from '@/services/tagService'
import { useAbortableQuery } from '@/hooks/useAbortableQuery'

const EMPTY_TAGS: Tag[] = []

interface UseTagsResult {
  tags: Tag[]
  isLoading: boolean
  error: string | null
}

export function useTags(): UseTagsResult {
  const { data: tags, isLoading, error } = useAbortableQuery(
    (signal) => fetchTags({ signal }),
    {
      initialData: EMPTY_TAGS,
      fallbackErrorMessage: "We couldn't load filters. Please try again.",
    },
  )

  return { tags, isLoading, error }
}
