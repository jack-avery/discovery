import { useMemo, useState } from 'react'
import { useSearch } from '@/app/providers'
import { PageShell } from '@/components/shared/PageShell'
import { SearchBar } from '@/components/shared'
import { CategoryDropdown, TagsDropdown } from '@/features/filters'
import { ResourceList } from '@/features/resources'
import { useCategories, useResources, useTags } from '@/hooks'
import {
  getResourceEmptyReason,
  resolveCategoryIds,
  resolveTagIds,
} from '@/utils/resource-filters'

export function ResourcesPage() {
  const { query, setQuery } = useSearch()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories()
  const { tags, isLoading: tagsLoading, error: tagsError } = useTags()

  const filters = useMemo(
    () => ({
      categoryIds: resolveCategoryIds(selectedCategories, categories),
      tagIds: resolveTagIds(selectedTags, tags),
      search: query.trim() || undefined,
    }),
    [selectedCategories, selectedTags, categories, tags, query],
  )

  const { resources, isLoading, error } = useResources(filters)
  const emptyReason = getResourceEmptyReason(filters, resources.length > 0)

  return (
    <PageShell
      title="Resources"
      description="List view of community services and support programs."
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchBar value={query} onChange={setQuery} placeholder="Search resources…" compact />
        </div>
        <CategoryDropdown
          categories={categories}
          value={selectedCategories}
          onChange={setSelectedCategories}
          isLoading={categoriesLoading}
          error={categoriesError}
        />
        <TagsDropdown
          tags={tags}
          value={selectedTags}
          onChange={setSelectedTags}
          isLoading={tagsLoading}
          error={tagsError}
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
