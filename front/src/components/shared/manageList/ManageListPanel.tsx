import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { List, Plus, X } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SearchBar } from '@/components/shared/SearchBar'
import { useToast } from '@/components/shared/toast'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { toUserFacingErrorMessage } from '@/utils/userFacingError'
import { ManageListAddForm } from './ManageListAddForm'
import { ManageListRow } from './ManageListRow'
import { ManageListUnsavedDialog } from './ManageListUnsavedDialog'
import type { ManageListPanelProps } from './types'


/**
 * Right-side slide-over for managing simple name-based lists.
 * Configure with title / itemName / callbacks; wire Categories or Tags later.
 */
export function ManageListPanel({
  open,
  onClose,
  title,
  itemName,
  searchPlaceholder,
  items,
  isLoading = false,
  onCreate,
  onUpdate,
}: ManageListPanelProps) {
  const toast = useToast()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const [search, setSearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const [confirmClose, setConfirmClose] = useState(false)
  const [pendingSwitch, setPendingSwitch] = useState<
    null | { type: 'add' } | { type: 'edit'; id: string }
  >(null)

  const isBusy = isCreating || isUpdating

  const addDirty = isAdding && addValue.trim().length > 0
  const editDirty =
    editingId != null &&
    editValue.trim() !==
      (items.find((item) => item.id === editingId)?.name ?? '').trim()
  const hasUnsavedChanges = addDirty || editDirty

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
      ),
    [items],
  )

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return sortedItems
    return sortedItems.filter((item) => {
      const haystack = `${item.name} ${item.secondary ?? ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [sortedItems, search])

  const resetTransientState = useCallback(() => {
    setSearch('')
    setIsAdding(false)
    setAddValue('')
    setAddError(null)
    setIsCreating(false)
    setEditingId(null)
    setEditValue('')
    setEditError(null)
    setIsUpdating(false)
    setConfirmClose(false)
    setPendingSwitch(null)
  }, [])

  // Reset when the panel closes fully.
  useEffect(() => {
    if (!open) resetTransientState()
  }, [open, resetTransientState])

  // Focus trap + body scroll lock while open.
  useEffect(() => {
    if (!open) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus()
    }, 0)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [open])

  const clearEditState = () => {
    setEditingId(null)
    setEditValue('')
    setEditError(null)
  }

  const clearAddState = () => {
    setIsAdding(false)
    setAddValue('')
    setAddError(null)
  }

  const requestClose = useCallback(() => {
    if (isBusy) return
    if (hasUnsavedChanges) {
      setPendingSwitch(null)
      setConfirmClose(true)
      return
    }
    onClose()
  }, [hasUnsavedChanges, isBusy, onClose])

  const confirmDiscard = useCallback(() => {
    if (pendingSwitch?.type === 'add') {
      clearEditState()
      setIsAdding(true)
      setPendingSwitch(null)
      setConfirmClose(false)
      return
    }
    if (pendingSwitch?.type === 'edit') {
      clearAddState()
      const item = items.find((entry) => entry.id === pendingSwitch.id)
      setPendingSwitch(null)
      setConfirmClose(false)
      if (item) {
        setEditingId(item.id)
        setEditValue(item.name)
        setEditError(null)
      }
      return
    }
    setConfirmClose(false)
    resetTransientState()
    onClose()
  }, [items, onClose, pendingSwitch, resetTransientState])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (confirmClose) {
        setConfirmClose(false)
        setPendingSwitch(null)
        return
      }
      requestClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, confirmClose, requestClose])

  const beginAdd = () => {
    if (isBusy) return
    if (editingId != null && editDirty) {
      setPendingSwitch({ type: 'add' })
      setConfirmClose(true)
      return
    }
    clearEditState()
    setIsAdding(true)
    setAddError(null)
  }

  const cancelAdd = () => {
    if (isCreating) return
    clearAddState()
  }

  const saveAdd = async () => {
    const name = addValue.trim()
    if (!name || isCreating) return

    setIsCreating(true)
    setAddError(null)
    try {
      await onCreate(name)
      toast.success(`${itemName} created.`)
      clearAddState()
    } catch (error) {
      const message = toUserFacingErrorMessage(error, {
        fallback: `Unable to create ${itemName.toLowerCase()}. Please try again.`,
        context: 'manage-list-create',
      })
      setAddError(message)
      toast.error(message)
    } finally {
      setIsCreating(false)
    }
  }

  const beginEdit = (id: string) => {
    if (isBusy) return
    if (isAdding && addDirty) {
      setPendingSwitch({ type: 'edit', id })
      setConfirmClose(true)
      return
    }
    const item = items.find((entry) => entry.id === id)
    if (!item) return
    clearAddState()
    setEditingId(id)
    setEditValue(item.name)
    setEditError(null)
  }

  const cancelEdit = () => {
    if (isUpdating) return
    clearEditState()
  }

  const saveEdit = async () => {
    if (editingId == null || isUpdating) return
    const name = editValue.trim()
    if (!name) return

    setIsUpdating(true)
    setEditError(null)
    try {
      await onUpdate(editingId, name)
      toast.success(`${itemName} updated.`)
      clearEditState()
    } catch (error) {
      const message = toUserFacingErrorMessage(error, {
        fallback: `Unable to update ${itemName.toLowerCase()}. Please try again.`,
        context: 'manage-list-update',
      })
      setEditError(message)
      toast.error(message)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!open) return null

  const resolvedSearchPlaceholder =
    searchPlaceholder ?? `Search ${itemName.toLowerCase()}s…`

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
        <button
          type="button"
          className="absolute inset-0 bg-surface-overlay"
          aria-label={`Close ${title}`}
          onClick={requestClose}
        />

        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(
            'relative z-10 flex h-full w-full flex-col bg-surface shadow-lg outline-none',
            'border-l border-border',
            // ~512–576px on desktop
            'sm:max-w-lg md:max-w-xl',
          )}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="font-heading text-lg font-semibold text-foreground"
              >
                {title}
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={requestClose}
              disabled={isBusy}
              aria-label={`Close ${title}`}
              className="shrink-0"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </header>

          <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 sm:px-5">
            {!isAdding ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="self-start"
                onClick={beginAdd}
                disabled={isBusy}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add {itemName}
              </Button>
            ) : (
              <ManageListAddForm
                itemName={itemName}
                value={addValue}
                onChange={setAddValue}
                onSave={() => {
                  void saveAdd()
                }}
                onCancel={cancelAdd}
                isSaving={isCreating}
                error={addError}
              />
            )}

            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={resolvedSearchPlaceholder}
              compact
              inputId="manage-list-search"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-thin sm:px-5">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground" role="status">
                Loading {itemName.toLowerCase()}s…
              </p>
            ) : items.length === 0 ? (
              <EmptyState
                title={`No ${itemName.toLowerCase()}s yet`}
                description={`Add a ${itemName.toLowerCase()} to get started.`}
                icon={<List className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
                className="py-10"
              />
            ) : filteredItems.length === 0 ? (
              <EmptyState
                title="No matches"
                description="Try a different search term."
                className="py-10"
              />
            ) : (
              <ul className="space-y-2" aria-label={`${title} list`}>
                {filteredItems.map((item) => (
                  <ManageListRow
                    key={item.id}
                    item={item}
                    isEditing={editingId === item.id}
                    editValue={editValue}
                    onEditValueChange={setEditValue}
                    onStartEdit={() => beginEdit(item.id)}
                    onSave={() => {
                      void saveEdit()
                    }}
                    onCancel={cancelEdit}
                    isSaving={isUpdating && editingId === item.id}
                    editDisabled={isBusy || (isAdding && addDirty)}
                    error={editingId === item.id ? editError : null}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ManageListUnsavedDialog
        open={confirmClose}
        onStay={() => {
          setConfirmClose(false)
          setPendingSwitch(null)
        }}
        onDiscard={confirmDiscard}
      />
    </>
  )
}
