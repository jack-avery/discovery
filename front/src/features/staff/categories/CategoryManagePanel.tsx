import { useEffect, useState } from 'react'
import {
  ManageListPanel,
  type ManageListItem,
} from '@/components/shared/manageList'
import {
  createCategory,
  fetchCategories,
  updateCategory,
} from '@/services/categoryService'

interface CategoryManagePanelProps {
  open: boolean
  onClose: () => void
}

/**
 * Dashboard-hosted Category management using the shared ManageListPanel.
 * Exposes name only; slug is generated client-side for the API.
 */
export function CategoryManagePanel({ open, onClose }: CategoryManagePanelProps) {
  const [items, setItems] = useState<ManageListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()
    setIsLoading(true)

    fetchCategories({ signal: controller.signal })
      .then((categories) => {
        if (controller.signal.aborted) return
        setItems(
          categories.map((category) => ({
            id: category.id,
            name: category.name,
          })),
        )
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setItems([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [open])

  const createAndRefresh = async (name: string) => {
    await createCategory({ name })
    const categories = await fetchCategories()
    setItems(
      categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    )
  }

  const updateAndRefresh = async (id: string, name: string) => {
    const categoryId = Number(id)
    if (!Number.isFinite(categoryId)) {
      throw new Error('Invalid category id.')
    }
    await updateCategory(categoryId, { name })
    const categories = await fetchCategories()
    setItems(
      categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    )
  }

  return (
    <ManageListPanel
      open={open}
      onClose={onClose}
      title="Manage Categories"
      itemName="Category"
      searchPlaceholder="Search categories…"
      items={items}
      isLoading={isLoading}
      onCreate={createAndRefresh}
      onUpdate={updateAndRefresh}
    />
  )
}
