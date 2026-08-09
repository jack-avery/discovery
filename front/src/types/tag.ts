/**
 * Backend GET /tags list item (list_tags in categories.py).
 * Returned as `data` after envelope unwrap — already a flat list.
 */
export interface TagDto {
  tag_id: number
  name: string
  slug: string
  is_active: boolean
}

/**
 * UI-facing filter option used by Discover Filters and filter dropdowns.
 *
 * Mapping from TagDto (see tagService):
 * - `id` = String(tag_id) for MultiSelectItem / React key contracts
 * - Remaining fields keep backend names for future ID-based filters
 */
export interface Tag {
  id: string
  slug: string
  name: string
  tag_id: number
  is_active: boolean
}
