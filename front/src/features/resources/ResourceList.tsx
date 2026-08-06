import { Loader2, Package, Search } from 'lucide-react'
import type { Category, Resource, Tag } from '@/types'
import { EmptyState } from '@/components/shared'
import { ResourceCard } from './ResourceCard'

export type ResourceEmptyReason = 'none' | 'search' | 'filter'

interface ResourceListProps {
  resources: Resource[]
  categories?: Category[]
  tags?: Tag[]
  isLoading?: boolean
  error?: string | null
  emptyReason?: ResourceEmptyReason
}

const emptyStateContent: Record<
  ResourceEmptyReason,
  { title: string; description: string }
> = {
  none: {
    title: 'No resources available',
    description:
      'Community resources will appear here once they are loaded from the API.',
  },
  search: {
    title: 'No search results',
    description:
      'No resources match your search. Try different keywords or clear your filters.',
  },
  filter: {
    title: 'No matching resources',
    description:
      'No resources match the selected category or filters. Try adjusting your filters.',
  },
}

export function ResourceList({
  resources,
  categories,
  tags,
  isLoading = false,
  error = null,
  emptyReason = 'none',
}: ResourceListProps) {
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-16"
        role="status"
        aria-label="Loading resources"
      >
        <Loader2 className="h-6 w-6 animate-spin text-interactive" aria-hidden="true" />
        <span className="sr-only">Loading resources</span>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="Unable to load resources"
        description={error}
        icon={<Search className="h-6 w-6 text-danger" strokeWidth={1.5} />}
      />
    )
  }

  if (resources.length === 0) {
    const { title, description } = emptyStateContent[emptyReason]
    const Icon = emptyReason === 'search' ? Search : Package

    return (
      <EmptyState
        title={title}
        description={description}
        icon={<Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
      />
    )
  }

  return (
    <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3" role="list">
      {resources.map((resource) => (
        <li key={resource.id}>
          <ResourceCard resource={resource} categories={categories} tags={tags} />
        </li>
      ))}
    </ul>
  )
}
