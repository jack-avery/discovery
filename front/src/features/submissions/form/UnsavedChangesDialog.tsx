import { ConfirmDialog } from './ConfirmDialog'

interface UnsavedChangesDialogProps {
  open: boolean
  onStay: () => void
  onDiscard: () => void
}

export function UnsavedChangesDialog({
  open,
  onStay,
  onDiscard,
}: UnsavedChangesDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="Discard changes?"
      description="You have unsaved changes. If you leave now, those changes will be lost."
      cancelLabel="Keep editing"
      confirmLabel="Discard changes"
      onCancel={onStay}
      onConfirm={onDiscard}
    />
  )
}
