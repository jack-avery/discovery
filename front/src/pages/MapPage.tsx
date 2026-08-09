import { useCallback, useState } from 'react'
import { SelectionProvider } from '@/app/providers/SelectionProvider'
import { PageShell } from '@/components/shared/PageShell'
import { CategoryFilter, type CategoryFilterValue } from '@/features/filters'
import { MapContainer } from '@/features/map'
import { useCategories, useResourceMap } from '@/hooks'
import {
  getDefaultMapQuery,
  mapQueryKey,
  type ResourceMapQuery,
} from '@/services/mapService'

/**
 * Legacy map-only route — see route audit in project docs.
 * Primary map experience lives at / (Discover).
 */
export function MapPage() {
  const [category, setCategory] = useState<CategoryFilterValue>('all')
  const [mapQuery, setMapQuery] = useState<ResourceMapQuery>(() => getDefaultMapQuery())
  const { categories, isLoading, error, reload } = useCategories()
  const { items: mapItems, isLoading: mapLoading, error: mapError } = useResourceMap(mapQuery)

  const handleViewportQueryChange = useCallback((next: ResourceMapQuery) => {
    setMapQuery((prev) => (mapQueryKey(prev) === mapQueryKey(next) ? prev : next))
  }, [])

  return (
    <PageShell
      title="Map"
      description="Standalone map view. The primary discovery experience is on the Discover page."
    >
      <CategoryFilter
        categories={categories}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
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
            onViewportQueryChange={handleViewportQueryChange}
          />
        </SelectionProvider>
      </div>
    </PageShell>
  )
}
