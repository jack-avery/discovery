import type { ResourceLocation } from './resource-location'

/** Lightweight pin payload — mirrors future GET /api/v1/resources/map response items. */
export interface ResourceMapItem {
  id: string
  slug: string
  name: string
  categorySlug: string
  location: ResourceLocation
  distanceMeters?: number
}
