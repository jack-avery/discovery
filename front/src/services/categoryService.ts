import { api } from '@/services/api'
import type { Category, CategoryTreeNode } from '@/types/category'

export interface FetchCategoriesOptions {
  signal?: AbortSignal
}

/**
 * Maps a backend category tree node to the UI Category shape.
 * `id` is stringified for MultiSelectItem / React keys; numeric id is retained.
 */
function mapCategoryNode(node: CategoryTreeNode): Category {
  return {
    id: String(node.category_id),
    slug: node.slug,
    name: node.name,
    category_id: node.category_id,
    description: node.description,
    icon_identifier: node.icon_identifier,
    color_hex: node.color_hex,
    parent_category_id: node.parent_category_id,
    display_order: node.display_order,
  }
}

/**
 * Flattens the hierarchical GET /categories tree into a list for existing UI.
 * Order: each node, then its children (depth-first); backend sort is preserved.
 */
function flattenCategoryTree(nodes: CategoryTreeNode[]): Category[] {
  const categories: Category[] = []

  const walk = (list: CategoryTreeNode[]) => {
    for (const node of list) {
      categories.push(mapCategoryNode(node))
      if (node.children.length > 0) {
        walk(node.children)
      }
    }
  }

  walk(nodes)
  return categories
}

/**
 * Fetch active categories from GET /categories.
 * Envelope is unwrapped by api.ts; callers receive a flat Category list.
 */
export async function fetchCategories(
  options: FetchCategoriesOptions = {},
): Promise<Category[]> {
  const tree = await api.get<CategoryTreeNode[]>('/categories', {
    signal: options.signal,
  })

  return flattenCategoryTree(tree ?? [])
}
