import { Fragment, useMemo } from 'react'
import { Marker, Polyline, Tooltip, useMap } from 'react-leaflet'
import { useResourceSelection } from '@/features/discover/useResourceSelection'
import { getMapBehaviour } from '@/features/map/config'
import type { OverlapGroup } from '@/features/map/overlapGrouping'
import {
  fanPixelOffsets,
  offsetAnchorToLatLng,
} from '@/features/map/overlapGrouping'
import { getResourceMarkerIcon } from '@/features/map/resourceMarkerIcon'

interface OverlapFanMarkersProps {
  groups: OverlapGroup[]
  /** Current map zoom — used to recompute display LatLngs when zoom changes. */
  zoom: number
}

/**
 * Display-only fan for non-separable resources at detail zoom.
 * Geographic resource coordinates are never mutated; Marker positions are
 * derived pixel offsets around the shared anchor, converted at the current zoom.
 * Pan does not change representation — only the map's normal projection moves.
 */
export function OverlapFanMarkers({ groups, zoom }: OverlapFanMarkersProps) {
  const map = useMap()
  const { selectResource, selectedResourceId } = useResourceSelection()
  const { cluster, overlap } = getMapBehaviour()

  const laidOut = useMemo(() => {
    return groups.map((group) => {
      const offsets = fanPixelOffsets(group.members.length, overlap.fanRadiusPx)
      const members = group.members.map((item, index) => ({
        item,
        position: offsetAnchorToLatLng(map, group.anchor, offsets[index]!),
      }))
      return { group, members }
    })
    // zoom is intentional: pixel→LatLng conversion depends on current zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map identity is stable
  }, [groups, map, overlap.fanRadiusPx, zoom])

  return (
    <>
      {laidOut.map(({ group, members }) => (
        <Fragment key={group.key}>
          {overlap.showSpiderLegs
            ? members.map(({ item, position }) => (
                <Polyline
                  key={`leg-${group.key}-${item.id}`}
                  positions={[
                    [group.anchor.latitude, group.anchor.longitude],
                    position,
                  ]}
                  pathOptions={{
                    ...cluster.spiderLegPolylineOptions,
                    interactive: false,
                  }}
                />
              ))
            : null}
          {members.map(({ item, position }) => {
            const selected = selectedResourceId === item.id
            return (
              <Marker
                key={`fan-${item.id}`}
                position={position}
                icon={getResourceMarkerIcon({ selected })}
                alt={item.name}
                keyboard
                zIndexOffset={selected ? 1000 : 500}
                eventHandlers={{
                  click: () => selectResource(item.id),
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -6]}
                  opacity={1}
                  permanent={false}
                  interactive={false}
                  className="resource-map-tooltip"
                >
                  {item.name}
                </Tooltip>
              </Marker>
            )
          })}
        </Fragment>
      ))}
    </>
  )
}
