import L from 'leaflet'

/** Category slug → marker colour. Keys must be slugs, never display names. */
const CATEGORY_COLORS: Record<string, string> = {
  'food-support': '#c45c26',
  housing: '#5b4a9e',
  'mental-health': '#2d7a6e',
  healthcare: '#3d6b8e',
  employment: '#6b5b3e',
  education: '#4a6fa5',
  recreation: '#7a4a8a',
  transportation: '#5a6b4a',
}

const DEFAULT_COLOR = '#3d6b8e'

export interface CategoryIconOptions {
  selected?: boolean
  /** Prefer backend `color_hex` when present on map pins. */
  colorHex?: string | null
}

/**
 * Returns a Leaflet DivIcon for a map marker keyed by category slug.
 * When `colorHex` is provided (from GET /resources/map), it takes precedence.
 */
export function getCategoryMarkerIcon(
  categorySlug: string,
  options: CategoryIconOptions = {},
): L.DivIcon {
  const color =
    options.colorHex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(options.colorHex)
      ? options.colorHex
      : (CATEGORY_COLORS[categorySlug] ?? DEFAULT_COLOR)
  const selectedClass = options.selected ? ' resource-map-marker__pin--selected' : ''

  return L.divIcon({
    className: 'resource-map-marker',
    html: `<div class="resource-map-marker__pin${selectedClass}" style="background-color:${color}" aria-hidden="true"><span class="resource-map-marker__icon">●</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })
}
