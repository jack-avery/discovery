import L from 'leaflet'

/** Stable DivIcon instances keyed by selected state. */
const ICON_CACHE = new Map<string, L.DivIcon>()

export interface ResourceMarkerIconOptions {
  selected?: boolean
}

/**
 * Returns a Leaflet DivIcon for a resource map pin.
 *
 * Pin fill uses the semantic `--color-map-pin` design token (see leaflet-overrides.css).
 * Identical visual configs reuse the same DivIcon reference so react-leaflet
 * does not call setIcon on every marker when selection changes.
 */
export function getResourceMarkerIcon(
  options: ResourceMarkerIconOptions = {},
): L.DivIcon {
  const selected = Boolean(options.selected)
  const key = selected ? 'selected' : 'default'

  const cached = ICON_CACHE.get(key)
  if (cached) return cached

  const selectedClass = selected ? ' resource-map-marker__pin--selected' : ''
  const icon = L.divIcon({
    className: 'resource-map-marker',
    html: `<div class="resource-map-marker__pin${selectedClass}" aria-hidden="true"><span class="resource-map-marker__icon"></span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    // Open tooltips from the top of the pin so labels sit clearly above the marker.
    tooltipAnchor: [0, -32],
  })

  ICON_CACHE.set(key, icon)
  return icon
}
