import { useState } from 'react'
import { PageShell } from '@/components/shared/PageShell'
import { CategoryFilter, type CategoryFilterValue } from '@/features/filters'
import { MapContainer } from '@/features/map'
import { useCategories } from '@/hooks'

/**
 * Legacy map-only route — see route audit in project docs.
 * Primary map experience lives at / (Discover).
 */
export function MapPage() {
  const [category, setCategory] = useState<CategoryFilterValue>('all')
  const { categories, isLoading, error } = useCategories()

  return (
    <PageShell
      title="Map"
      description="Standalone map view. The primary discovery experience is on the Discover page."
    >
      <CategoryFilter
        categories={categories}
        isLoading={isLoading}
        error={error}
        active={category}
        onChange={setCategory}
      />

      <div className="h-[min(60vh,600px)]">
        <MapContainer className="h-full rounded-xl border border-border" />
      </div>
    </PageShell>
  )
}
