import { useEffect, useMemo, useState } from 'react'
import { useMap } from 'react-leaflet'
import { getMapBehaviour } from '@/features/map/config'
import { partitionOverlapGroups } from '@/features/map/overlapGrouping'
import { MarkerClusterGroup } from '@/features/map/MarkerClusterLayer'
import { OverlapFanMarkers } from '@/features/map/OverlapFanMarkers'
import { ResourceMapMarkers } from '@/features/map/ResourceMapMarkers'
import type { ResourceMapItem } from '@/types'

interface ResourceMarkersLayerProps {
  items: ResourceMapItem[]
}

/**
 * Owns clustering vs overlap-fan representation based on current zoom.
 *
 * zoom < overlap.detailZoom → all pins in MarkerClusterGroup
 * zoom >= overlap.detailZoom → non-separable groups as display-only fans;
 *                              remaining pins stay in MarkerClusterGroup
 *
 * Representation is derived from zoom + coordinates — never spiderfy state.
 */
export function ResourceMarkersLayer({ items }: ResourceMarkersLayerProps) {
  const map = useMap()
  const { overlap, viewport } = getMapBehaviour()
  const [zoom, setZoom] = useState(() => map.getZoom())

  useEffect(() => {
    const syncZoom = () => {
      setZoom(map.getZoom())
    }
    map.on('zoomend', syncZoom)
    syncZoom()
    return () => {
      map.off('zoomend', syncZoom)
    }
  }, [map])

  const { singletons, overlapGroups } = useMemo(
    () =>
      partitionOverlapGroups(items, {
        projectZoom: viewport.maxZoom,
        maxPixelDistance: overlap.maxPixelDistance,
      }),
    [items, viewport.maxZoom, overlap.maxPixelDistance],
  )

  const detailActive = zoom >= overlap.detailZoom
  const clusterItems = detailActive ? singletons : items
  const fanGroups = detailActive ? overlapGroups : []

  return (
    <>
      <MarkerClusterGroup>
        <ResourceMapMarkers items={clusterItems} />
      </MarkerClusterGroup>
      {fanGroups.length > 0 ? (
        <OverlapFanMarkers groups={fanGroups} zoom={zoom} />
      ) : null}
    </>
  )
}
