import { type ReactNode } from 'react'
import { Loader2, Package, Search } from 'lucide-react'
import type { Resource } from '@/types'
import { EmptyState } from '@/components/shared'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'
import { useWorkspaceNavigation } from '@/features/discover/providers/WorkspaceNavigationProvider'
import type { ResourceEmptyReason } from '@/features/resources'
import { cn } from '@/utils/cn'

interface ResultsListProps {
  resources: Resource[]
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
    description: 'Community resources will appear here once they are available.',
  },
  search: {
    title: 'No search results',
    description:
      'No resources match your search. Try different keywords or clear your filters.',
  },
  filter: {
    title: 'No matching resources',
    description:
      'No resources match the selected category or tags. Try adjusting your filters.',
  },
}

export function ResultsList({
  resources,
  isLoading = false,
  error = null,
  emptyReason = 'none',
}: ResultsListProps) {
  const { openResourceDetail, selectedResourceId } = useWorkspaceNavigation()

  let content: ReactNode

  if (isLoading) {
    content = (
      <div
        className="flex items-center justify-center py-10"
        role="status"
        aria-label="Loading resources"
      >
        <Loader2 className="h-5 w-5 animate-spin text-interactive" aria-hidden="true" />
        <span className="sr-only">Loading resources</span>
      </div>
    )
  } else if (error) {
    content = (
      <EmptyState
        title="Unable to load resources"
        description={error}
        icon={<Search className="h-6 w-6 text-danger" strokeWidth={1.5} />}
        className="py-8"
      />
    )
  } else if (resources.length === 0) {
    const { title, description } = emptyStateContent[emptyReason]
    const Icon = emptyReason === 'search' ? Search : Package
    content = (
      <EmptyState
        title={title}
        description={description}
        icon={<Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
        className="py-8"
      />
    )
  } else {
    content = (
      <ul className="list-none divide-y divide-border p-0" role="list">
        {resources.map((resource) => {
          const isSelected = selectedResourceId === resource.id
          return (
            <li key={resource.id}>
              <button
                type="button"
                onClick={() => openResourceDetail(resource.id)}
                aria-current={isSelected ? 'true' : undefined}
                className={cn(
                  'flex w-full flex-col gap-0.5 px-1 py-3 text-left transition-colors',
                  'hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
                  isSelected && 'bg-muted/80',
                )}
              >
                <span className="font-heading text-sm font-semibold text-foreground">
                  {resource.name}
                </span>
                {resource.resource_type && (
                  <span className="text-xs text-muted-foreground">{resource.resource_type}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return <WorkspaceSection aria-label="Results list">{content}</WorkspaceSection>
}
