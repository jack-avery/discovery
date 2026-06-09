import { useMemo, useState } from 'react'
import { useSearch } from '@/app/providers'
import { PageShell } from '@/components/shared/PageShell'
import { SearchBar } from '@/components/shared'
import { CategoryFilter, type CategoryFilterValue, TagFilter } from '@/features/filters'
import { ResourceList } from '@/features/resources'
import { useCategories, useResources, useTags } from '@/hooks'
import { getResourceEmptyReason } from '@/utils/resource-filters'

export function ResourcesPage() {
  const { query, setQuery } = useSearch()
  const [category, setCategory] = useState<CategoryFilterValue>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories()
  const { tags, isLoading: tagsLoading, error: tagsError } = useTags()

  const filters = useMemo(
    () => ({
      categorySlug: category === 'all' ? undefined : category,
      tagSlugs: selectedTags.length > 0 ? selectedTags : undefined,
      search: query.trim() || undefined,
    }),
    [category, selectedTags, query],
  )

  const { resources, isLoading, error } = useResources(filters)
  const emptyReason = getResourceEmptyReason(filters, resources.length > 0)

  return (
    <PageShell
      title="Resources"
      description="List view of community services and support programs."
    >
      <div className="space-y-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Search resources…" />
        <CategoryFilter
          categories={categories}
          isLoading={categoriesLoading}
          error={categoriesError}
          active={category}
          onChange={setCategory}
        />
        <TagFilter
          tags={tags}
          isLoading={tagsLoading}
          error={tagsError}
          active={selectedTags}
          onChange={setSelectedTags}
        />
      </div>

      <ResourceList
        resources={resources}
        categories={categories}
        tags={tags}
        isLoading={isLoading}
        error={error}
        emptyReason={emptyReason}
      />
    </PageShell>
  )
}
