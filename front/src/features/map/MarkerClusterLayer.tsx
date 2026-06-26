import { createLayerComponent } from '@react-leaflet/core'
import L from 'leaflet'
import type { PropsWithChildren } from 'react'
import 'leaflet.markercluster'

type MarkerClusterGroupProps = PropsWithChildren<L.MarkerClusterGroupOptions>

export const MarkerClusterGroup = createLayerComponent<
  L.MarkerClusterGroup,
  MarkerClusterGroupProps
>(
  function createMarkerClusterGroup(props, context) {
    const instance = new L.MarkerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
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
