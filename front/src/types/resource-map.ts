/**
 * Backend GET /resources/map pin (`get_map_pins` in resources.py).
 * Returned inside `data.pins` after envelope unwrap.
 */
export interface MapPinDto {
  resource_id: number
  slug: string
  name: string
  resource_type: string | null
  lat: number
  lng: number
  is_virtual: boolean
  category_name: string | null
  color_hex: string | null
  icon_identifier: string | null
  distance_km: number
}

/**
 * Backend GET /resources/map success payload (`data` after unwrap).
 */
export interface MapPinsDto {
  pins: MapPinDto[]
  count: number
}

/**
 * UI marker used by ResourceMapMarkers / clustering.
 *
 * Mapping from MapPinDto (see mapService):
 * - `id` = String(resource_id)
 * - `location.latitude/longitude` ← `lat`/`lng`
 * - `distanceMeters` ← `distance_km * 1000`
 * - `categoryName` ← `category_name`
 *
 * Marker fill colour is the shared `--color-map-pin` token (not per-category).
 */
export interface ResourceMapItem {
  id: string
  slug: string
  name: string
  categoryName?: string | null
  iconIdentifier?: string | null
  resourceType?: string | null
  isVirtual?: boolean
  location: {
    latitude: number
    longitude: number
    address?: string
  }
  distanceMeters?: number
}
