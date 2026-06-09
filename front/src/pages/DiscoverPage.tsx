import { useState } from 'react'
import { useSearch } from '@/app/providers'
import { SelectionProvider } from '@/app/providers/SelectionProvider'
import { DiscoverLayout } from '@/app/layouts'
import type { CategoryFilterValue } from '@/features/filters'
import { useCategories, useTags } from '@/hooks'

export function DiscoverPage() {
  return (
    <SelectionProvider>
      <DiscoverPageContent />
    </SelectionProvider>
  )
}

function DiscoverPageContent() {
  const { query, setQuery } = useSearch()
  const [category, setCategory] = useState<CategoryFilterValue>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories()
  const { tags, isLoading: tagsLoading, error: tagsError } = useTags()

  return (
    <DiscoverLayout
      search={query}
      onSearchChange={setQuery}
      category={category}
      onCategoryChange={setCategory}
      selectedTags={selectedTags}
      onTagsChange={setSelectedTags}
      categories={categories}
      tags={tags}
      categoriesLoading={categoriesLoading}
      categoriesError={categoriesError}
      tagsLoading={tagsLoading}
      tagsError={tagsError}
    />
  )
}
