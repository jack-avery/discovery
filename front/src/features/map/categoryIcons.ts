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

/** Stable DivIcon instances keyed by visual configuration. */
const ICON_CACHE = new Map<string, L.DivIcon>()

export interface CategoryIconOptions {
  selected?: boolean
  /** Prefer backend `color_hex` when present on map pins. */
  colorHex?: string | null
}

function resolveMarkerColor(
  categorySlug: string,
  colorHex?: string | null,
): string {
  if (colorHex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorHex)) {
    return colorHex.toLowerCase()
  }
  return CATEGORY_COLORS[categorySlug] ?? DEFAULT_COLOR
}

function iconCacheKey(color: string, selected: boolean): string {
  return `${color}|${selected ? '1' : '0'}`
}

/**
 * Returns a Leaflet DivIcon for a map marker keyed by category slug.
 * When `colorHex` is provided (from GET /resources/map), it takes precedence.
 *
 * Identical visual configs reuse the same DivIcon reference so react-leaflet
 * does not call setIcon on every marker when selection changes.
 */
export function getCategoryMarkerIcon(
  categorySlug: string,
  options: CategoryIconOptions = {},
): L.DivIcon {
  const color = resolveMarkerColor(categorySlug, options.colorHex)
  const selected = Boolean(options.selected)
  const key = iconCacheKey(color, selected)

  const cached = ICON_CACHE.get(key)
  if (cached) return cached

  const selectedClass = selected ? ' resource-map-marker__pin--selected' : ''
  const icon = L.divIcon({
    className: 'resource-map-marker',
    html: `<div class="resource-map-marker__pin${selectedClass}" style="background-color:${color}" aria-hidden="true"><span class="resource-map-marker__icon">●</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })

  ICON_CACHE.set(key, icon)
  return icon
}
