import { Button } from '@/components/ui'

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
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-surface-overlay"
        aria-label="Dismiss"
        onClick={onStay}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="manage-list-unsaved-title"
        aria-describedby="manage-list-unsaved-desc"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lg"
      >
        <h2
          id="manage-list-unsaved-title"
          className="font-heading text-lg font-semibold text-foreground"
        >
          Discard changes?
        </h2>
        <p
          id="manage-list-unsaved-desc"
          className="mt-2 text-sm text-muted-foreground"
        >
          You have unsaved changes. If you leave now, those changes will be lost.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onStay}>
            Keep editing
          </Button>
          <Button type="button" variant="primary" onClick={onDiscard}>
            Discard changes
          </Button>
        </div>
      </div>
    </div>
  )
}
