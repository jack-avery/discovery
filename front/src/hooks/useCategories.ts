import { useCallback, useState } from 'react'
import type { Category } from '@/types'
import { fetchCategories } from '@/services/categoryService'
import { useAbortableQuery } from '@/hooks/useAbortableQuery'

const EMPTY_CATEGORIES: Category[] = []

const CATEGORIES_LOAD_ERROR =
  "We couldn't load the available categories. Please try again."

interface UseCategoriesResult {
  categories: Category[]
  isLoading: boolean
  error: string | null
  reload: () => void
}

export function useCategories(): UseCategoriesResult {
  const [reloadKey, setReloadKey] = useState(0)

  const { data: categories, isLoading, error } = useAbortableQuery(
    (signal) => fetchCategories({ signal }),
    {
      initialData: EMPTY_CATEGORIES,
      fallbackErrorMessage: CATEGORIES_LOAD_ERROR,
      deps: [reloadKey],
    },
  )

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  return {
    categories,
    isLoading,
    error,
    reload,
  }
}
