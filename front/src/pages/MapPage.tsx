import { useState } from 'react'
import { SelectionProvider } from '@/app/providers/SelectionProvider'
import { PageShell } from '@/components/shared/PageShell'
import { CategoryFilter, type CategoryFilterValue } from '@/features/filters'
import { MapContainer } from '@/features/map'
import { useCategories, useResourceMap } from '@/hooks'

/**
 * Legacy map-only route — see route audit in project docs.
 * Primary map experience lives at / (Discover).
 */
export function MapPage() {
  const [category, setCategory] = useState<CategoryFilterValue>('all')
  const { categories, isLoading, error } = useCategories()
  const { items: mapItems, isLoading: mapLoading, error: mapError } = useResourceMap()

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
        <SelectionProvider>
          <MapContainer
            className="h-full rounded-xl border border-border"
            items={mapItems}
            isLoading={mapLoading}
            error={mapError}
          />
        </SelectionProvider>
      </div>
    </PageShell>
  )
}
