import { useState } from 'react'
import { useSearch } from '@/app/providers'
import { SelectionProvider } from '@/app/providers/SelectionProvider'
import { DiscoverLayout } from '@/app/layouts'
import { useCategories, useResourceMap, useTags } from '@/hooks'

export function DiscoverPage() {
  return (
    <SelectionProvider>
      <DiscoverPageContent />
    </SelectionProvider>
  )
}

function DiscoverPageContent() {
  const { query, setQuery } = useSearch()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories()
  const { tags, isLoading: tagsLoading, error: tagsError } = useTags()
  const { items: mapItems, isLoading: mapLoading, error: mapError } = useResourceMap()

  return (
    <div className="h-full min-h-0">
      <DiscoverLayout
        search={query}
        onSearchChange={setQuery}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        categories={categories}
        tags={tags}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesError}
        tagsLoading={tagsLoading}
        tagsError={tagsError}
        mapItems={mapItems}
        mapLoading={mapLoading}
        mapError={mapError}
      />
    </div>
  )
}
