import { MapStage } from '@/features/discover/MapStage'
import { ResourceDetailPanel } from '@/features/discover/ResourceDetailPanel'
import { useSidebar } from '@/app/providers/SidebarProvider'
import type { Category, Tag } from '@/types'

interface DiscoverLayoutProps {
  search: string
  onSearchChange: (value: string) => void
  selectedCategories: string[]
  onCategoriesChange: (slugs: string[]) => void
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  categories: Category[]
  tags: Tag[]
  categoriesLoading?: boolean
  categoriesError?: string | null
  tagsLoading?: boolean
  tagsError?: string | null
}

export function DiscoverLayout(props: DiscoverLayoutProps) {
  const { openSidebar } = useSidebar()

  return (
    <MapStage filterBar={{ ...props, onSidebarOpen: openSidebar }}>
      <ResourceDetailPanel />
    </MapStage>
  )
}
