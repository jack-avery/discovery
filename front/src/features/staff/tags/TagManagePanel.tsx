import { useEffect, useState } from 'react'
import {
  ManageListPanel,
  type ManageListItem,
} from '@/components/shared/manageList'
import { createTag, fetchTags, updateTag } from '@/services/tagService'

interface TagManagePanelProps {
  open: boolean
  onClose: () => void
}

/**
 * Dashboard-hosted filter management using the shared ManageListPanel.
 * Exposes name only; slug is generated client-side for the API.
 */
export function TagManagePanel({ open, onClose }: TagManagePanelProps) {
  const [items, setItems] = useState<ManageListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()
    setIsLoading(true)

    fetchTags({ signal: controller.signal })
      .then((tags) => {
        if (controller.signal.aborted) return
        setItems(
          tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
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
    await createTag({ name })
    const tags = await fetchTags()
    setItems(
      tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),
    )
  }

  const updateAndRefresh = async (id: string, name: string) => {
    const tagId = Number(id)
    if (!Number.isFinite(tagId)) {
      throw new Error('Invalid filter id.')
    }
    await updateTag(tagId, { name })
    const tags = await fetchTags()
    setItems(
      tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),
    )
  }

  return (
    <ManageListPanel
      open={open}
      onClose={onClose}
      title="Manage Filters"
      itemName="Filter"
      searchPlaceholder="Search filters…"
      items={items}
      isLoading={isLoading}
      onCreate={createAndRefresh}
      onUpdate={updateAndRefresh}
    />
  )
}
