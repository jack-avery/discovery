/**
 * Reusable managed-list primitives for simple admin taxonomies
 * (categories, tags, and similar name-based lists).
 */

export interface ManageListItem {
  /** Stable unique id (stringified backend id is fine). */
  id: string
  /** Primary display / edit field. */
  name: string
  /** Optional secondary line (e.g. slug) — display only, not edited here. */
  secondary?: string
}

export interface ManageListPanelProps {
  open: boolean
  onClose: () => void
  /** Panel heading, e.g. "Manage Categories". */
  title: string
  /** Singular item label used in actions, e.g. "Category" → "Add Category". */
  itemName: string
  searchPlaceholder?: string
  items: ManageListItem[]
  /** Initial list load. */
  isLoading?: boolean
  /**
   * Persist a new item. Resolve on success (parent should refetch before resolve).
   * Reject with Error (or string message) on failure.
   */
  onCreate: (name: string) => Promise<void>
  /**
   * Persist an edit. Resolve on success (parent should refetch before resolve).
   * Reject with Error (or string message) on failure.
   */
  onUpdate: (id: string, name: string) => Promise<void>
}
