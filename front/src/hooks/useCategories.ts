import type { Category } from '@/types'
import { fetchCategories } from '@/services/categoryService'
import { useAbortableQuery } from '@/hooks/useAbortableQuery'

const EMPTY_CATEGORIES: Category[] = []

interface UseCategoriesResult {
  categories: Category[]
  isLoading: boolean
  error: string | null
}

export function useCategories(): UseCategoriesResult {
  const { data: categories, isLoading, error } = useAbortableQuery(
    (signal) => fetchCategories({ signal }),
    {
      initialData: EMPTY_CATEGORIES,
      fallbackErrorMessage: 'Failed to load categories',
    },
  )

  return { categories, isLoading, error }
}
