import { createLayerComponent } from '@react-leaflet/core'
import L from 'leaflet'
import type { PropsWithChildren } from 'react'
import { getMapBehaviour } from '@/features/map/config'
import 'leaflet.markercluster'

type MarkerClusterGroupProps = PropsWithChildren<L.MarkerClusterGroupOptions>

export const MarkerClusterGroup = createLayerComponent<
  L.MarkerClusterGroup,
  MarkerClusterGroupProps
>(
  function createMarkerClusterGroup(props, context) {
    const { cluster } = getMapBehaviour()

    const instance = new L.MarkerClusterGroup({
      showCoverageOnHover: cluster.showCoverageOnHover,
      spiderfyOnMaxZoom: cluster.spiderfyOnMaxZoom,
      maxClusterRadius: cluster.maxClusterRadius,
      ...props,
    })
    return {
      instance,
      context: {
        ...context,
        layerContainer: instance,
      },
    }
  },
  function updateMarkerClusterGroup() {
    // Static options for this branch — extend when API integration adds dynamic clustering.
  },
)
