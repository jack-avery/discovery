import type { ReactNode } from 'react'
import { FilterBar } from '@/features/discover/FilterBar'
import { MapStage } from '@/features/discover/MapStage'
import { ResourceDetailPanel } from '@/features/discover/ResourceDetailPanel'
import { useSidebar } from '@/app/providers/SidebarProvider'
import type { Category, Tag } from '@/types'
import type { CategoryFilterValue } from '@/features/filters'

interface DiscoverLayoutProps {
  search: string
  onSearchChange: (value: string) => void
  category: CategoryFilterValue
  onCategoryChange: (value: CategoryFilterValue) => void
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  categories: Category[]
  tags: Tag[]
  categoriesLoading?: boolean
  categoriesError?: string | null
  tagsLoading?: boolean
  tagsError?: string | null
  futureFilters?: ReactNode
}

export function DiscoverLayout(props: DiscoverLayoutProps) {
  const { openSidebar } = useSidebar()

  return (
    <div className="flex h-full flex-col">
      <FilterBar {...props} onSidebarOpen={openSidebar} />

      <MapStage>
        <ResourceDetailPanel />
      </MapStage>
    </div>
  )
}
