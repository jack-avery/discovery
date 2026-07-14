/**
 * Backend GET /resources list item (`Resource.to_dict_summary()`).
 * Returned inside `data.resources` after envelope unwrap.
 */
export interface ResourceSummaryDto {
  resource_id: number
  slug: string
  is_active: boolean
  last_verified_at: string | null
  name: string | null
  resource_type: string | null
  image_url: string | null
}

/**
 * Backend pagination meta (`utils.paginate` → `data.pagination`).
 */
export interface PaginationMeta {
  page: number
  per_page: number
  total_items: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

/**
 * Backend GET /resources success payload (`data` after unwrap).
 */
export interface ResourceListDto {
  resources: ResourceSummaryDto[]
  pagination: PaginationMeta
}

/**
 * Nested shapes from `ResourceVersion.to_dict_full()`.
 * Kept nested to mirror the backend for detail, moderation, and future edit flows.
 */
export interface ResourceVersionCategoryDto {
  category_id: number
  name: string | null
  is_primary: boolean
}

export interface ResourceVersionTagDto {
  tag_id: number
  name: string | null
}

export interface ResourceLocationDto {
  location_id: number
  location_name: string | null
  address_line1: string | null
  address_line2: string | null
  city: string
  province: string
  postal_code: string | null
  country: string
  lat: number | null
  lng: number | null
  is_primary: boolean
  is_virtual: boolean
  service_area_notes: string | null
}

export interface ResourceContactDto {
  contact_id: number
  contact_type: string
  contact_value: string
  contact_label: string | null
  is_primary: boolean
}

/** `day_of_week`: 0 = Sunday … 6 = Saturday (backend contract). */
export interface ResourceHourDto {
  day_of_week: number
  opens_at: string | null
  closes_at: string | null
  is_closed: boolean
  by_appointment_only: boolean
  notes: string | null
}

/**
 * Backend approved version payload (`to_dict_full()`).
 */
export interface ResourceVersionDto {
  resource_version_id: number
  resource_type: string
  moderation_status: string
  name: string
  description: string | null
  eligibility: string | null
  cost_description: string | null
  accessibility_notes: string | null
  general_notes: string | null
  image_url: string | null
  submitted_at: string | null
  approved_at: string | null
  expires_at: string | null
  categories: ResourceVersionCategoryDto[]
  tags: ResourceVersionTagDto[]
  locations: ResourceLocationDto[]
  contacts: ResourceContactDto[]
  hours: ResourceHourDto[]
}

/**
 * Backend GET /resources/<id> envelope `data`.
 * Frontend detail model is this shape — no flattening.
 */
export interface ResourceDetailDto {
  resource_id: number
  slug: string
  version: ResourceVersionDto
}

/** Alias: detail UI consumes the backend detail contract directly. */
export type ResourceDetail = ResourceDetailDto

/**
 * Legacy status values used by ResourceCard pending badge.
 * Not present on GET /resources summary — reserved for detail/moderation UI.
 */
export type ResourceStatus = 'published' | 'pending' | 'rejected'

/**
 * UI resource for list views.
 *
 * Mapping from ResourceSummaryDto (see resourceService):
 * - `id` = String(resource_id) for selection / React keys
 * - `name` falls back to empty string when backend returns null
 * - description / address / hours / phone / categoryId / tagIds / status
 *   are NOT in the summary payload — left optional for detail integration
 */
export interface Resource {
  id: string
  resource_id: number
  slug: string
  name: string
  is_active: boolean
  last_verified_at: string | null
  resource_type: string | null
  image_url: string | null
  /** Not in GET /resources summary — detail endpoint provides categories. */
  categoryId?: string
  description?: string
  address?: string
  hours?: string
  phone?: string
  tagIds?: string[]
  status?: ResourceStatus
}
