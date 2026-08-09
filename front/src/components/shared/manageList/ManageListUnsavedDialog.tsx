import { ConfirmDialog } from '@/features/submissions/form/ConfirmDialog'

interface ManageListUnsavedDialogProps {
  open: boolean
  onStay: () => void
  onDiscard: () => void
}

/**
 * Warns before discarding in-progress add/edit when closing the panel.
 */
export function ManageListUnsavedDialog({
  open,
  onStay,
  onDiscard,
}: ManageListUnsavedDialogProps) {
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
