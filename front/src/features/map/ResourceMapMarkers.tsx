import { Marker } from 'react-leaflet'
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
        <Marker
          key={item.id}
          position={[item.location.latitude, item.location.longitude]}
          icon={getResourceMarkerIcon({
            selected: selectedResourceId === item.id,
          })}
          title={item.name}
          eventHandlers={{
            click: () => selectResource(item.id),
          }}
        />
      ))}
    </>
  )
}
