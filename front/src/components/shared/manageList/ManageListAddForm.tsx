import { Button, Input } from '@/components/ui'

interface ManageListAddFormProps {
  itemName: string
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  error?: string | null
}

/**
 * Inline create form expanded from "Add {Item}".
 */
export function ManageListAddForm({
  itemName,
  value,
  onChange,
  onSave,
  onCancel,
  isSaving,
  error,
}: ManageListAddFormProps) {
  const inputId = 'manage-list-add-name'

  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-surface-raised/60 p-3"
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
          {itemName} name
        </label>
        <Input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Enter ${itemName.toLowerCase()} name`}
          disabled={isSaving}
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-danger" role="alert">
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
          disabled={isSaving || value.trim().length === 0}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
