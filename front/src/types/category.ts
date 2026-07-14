/**
 * Backend GET /categories tree node (`_build_tree` in categories.py).
 * Returned as `data` after envelope unwrap.
 */
export interface CategoryTreeNode {
  category_id: number
  name: string
  slug: string
  description: string | null
  icon_identifier: string | null
  color_hex: string | null
  parent_category_id: number | null
  display_order: number
  children: CategoryTreeNode[]
}

/**
 * UI-facing category used by filters, chips, and lookups.
 *
 * Mapping from CategoryTreeNode (see categoryService):
 * - Tree is flattened depth-first (backend already sorts by display_order, name)
 * - `id` = String(category_id) for existing MultiSelect / React key contracts
 * - Remaining fields keep backend names for future map styling / ID-based filters
 */
export interface Category {
  id: string
  slug: string
  name: string
  category_id: number
  description: string | null
  icon_identifier: string | null
  color_hex: string | null
  parent_category_id: number | null
  display_order: number
}
