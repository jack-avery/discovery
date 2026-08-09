import { useEffect, useRef } from 'react'
import type { Marker as LeafletMarker } from 'leaflet'
import { Marker, Tooltip } from 'react-leaflet'
import { useResourceSelection } from '@/features/discover/useResourceSelection'
import type { ResourceMapItem } from '@/types'
import { getResourceMarkerIcon } from './resourceMarkerIcon'

interface ResourceMapMarkersProps {
  items: ResourceMapItem[]
}

export function ResourceMapMarkers({ items }: ResourceMapMarkersProps) {
  const { selectResource, selectedResourceId } = useResourceSelection()

  return (
    <>
      {items.map((item) => (
        <ResourceMapMarker
          key={item.id}
          item={item}
          selected={selectedResourceId === item.id}
          onSelect={selectResource}
        />
      ))}
    </>
  )
}

function ResourceMapMarker({
  item,
  selected,
  onSelect,
}: {
  item: ResourceMapItem
  selected: boolean
  onSelect: (id: string) => void
}) {
  const markerRef = useRef<LeafletMarker | null>(null)

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    const element = marker.getElement()
    if (!element) return

    // Leaflet markers are keyboard-focusable (`keyboard: true`); mirror hover tooltips on focus.
    const showTooltip = () => {
      marker.openTooltip()
    }
    const hideTooltip = () => {
      marker.closeTooltip()
    }

    element.addEventListener('focus', showTooltip)
    element.addEventListener('blur', hideTooltip)
    element.setAttribute('aria-label', item.name)

    return () => {
      element.removeEventListener('focus', showTooltip)
      element.removeEventListener('blur', hideTooltip)
    }
  }, [item.id, item.name])

  return (
    <Marker
      ref={markerRef}
      position={[item.location.latitude, item.location.longitude]}
      icon={getResourceMarkerIcon({ selected })}
      alt={item.name}
      keyboard
      eventHandlers={{
        click: () => onSelect(item.id),
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
}
