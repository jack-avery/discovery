import { useEffect, useId, useState } from 'react'
import { Button, Textarea } from '@/components/ui'
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility'
import { cn } from '@/utils/cn'

interface RejectSubmissionDialogProps {
  open: boolean
  resourceName: string
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: (notes: string) => void
}

/**
 * Confirm rejection with optional notes (backend `notes` / `review_comment`).
 */
export function RejectSubmissionDialog({
  open,
  resourceName,
  isSubmitting,
  onCancel,
  onConfirm,
}: RejectSubmissionDialogProps) {
  const titleId = useId()
  const descId = useId()
  const notesId = useId()
  const [notes, setNotes] = useState('')
  const containerRef = useDialogAccessibility({
    open,
    onDismiss: onCancel,
    dismissDisabled: isSubmitting,
  })

  useEffect(() => {
    if (open) setNotes('')
  }, [open])

  if (!open) return null

  const displayName = resourceName.trim() || 'this submission'

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-surface-overlay"
        aria-label="Dismiss"
        tabIndex={-1}
        disabled={isSubmitting}
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          'relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lg',
        )}
      >
        <h2
          id={titleId}
          className="font-heading text-lg font-semibold text-foreground"
        >
          Reject &ldquo;{displayName}&rdquo;?
        </h2>
        <div id={descId} className="mt-2 space-y-2 text-sm text-muted-foreground">
          <p>
            This submission will not be published to the community resource map.
          </p>
          <p>
            You can optionally include a reason to help explain the decision for
            future reference.
          </p>
        </div>

        <div className="mt-4 space-y-1.5">
          <label
            htmlFor={notesId}
            className="text-xs font-medium text-foreground"
          >
            Rejection reason (optional)
          </label>
          <Textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optionally explain why this submission is being rejected..."
            disabled={isSubmitting}
            rows={3}
            className="min-h-[5rem]"
          />
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            className="bg-danger text-danger-foreground hover:bg-danger/90"
            disabled={isSubmitting}
            onClick={() => onConfirm(notes)}
          >
            {isSubmitting ? 'Rejecting…' : 'Reject'}
          </Button>
        </div>
      </div>
    </div>
  )
}
