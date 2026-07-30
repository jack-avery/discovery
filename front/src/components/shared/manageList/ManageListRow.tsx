import { Pencil } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import type { ManageListItem } from './types'
import { cn } from '@/utils/cn'

interface ManageListRowProps {
  item: ManageListItem
  isEditing: boolean
  editValue: string
  onEditValueChange: (value: string) => void
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  editDisabled: boolean
  error?: string | null
}

/**
 * Single managed-list row: read view or inline edit.
 */
export function ManageListRow({
  item,
  isEditing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onSave,
  onCancel,
  isSaving,
  editDisabled,
  error,
}: ManageListRowProps) {
  const inputId = `manage-list-edit-${item.id}`

  if (isEditing) {
    return (
      <li className="rounded-xl border border-interactive/30 bg-interactive-muted/40 p-3">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!isSaving) onSave()
          }}
        >
          <div className="space-y-1.5">
            <label
              htmlFor={inputId}
              className="text-xs font-medium text-muted-foreground"
            >
              Name
            </label>
            <Input
              id={inputId}
              value={editValue}
              onChange={(event) => onEditValueChange(event.target.value)}
              disabled={isSaving}
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${inputId}-error` : undefined}
            />
            {error ? (
              <p
                id={`${inputId}-error`}
                className="text-xs text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving || editValue.trim().length === 0}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
        {item.secondary ? (
          <p className="truncate text-xs text-muted-foreground">{item.secondary}</p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={onStartEdit}
        disabled={editDisabled}
        aria-label={`Edit ${item.name}`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Button>
    </li>
  )
}
