import type { ReactNode } from 'react'
import { useId } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility'
import { cn } from '@/utils/cn'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  cancelLabel?: string
  confirmLabel?: string
  /** Applies the shared destructive (danger) confirm button styles. */
  destructive?: boolean
  isSubmitting?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  destructive = false,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const containerRef = useDialogAccessibility({
    open,
    onDismiss: onCancel,
    dismissDisabled: isSubmitting,
  })

  if (!open) return null

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
        aria-describedby={descriptionId}
        className={cn(
          'relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lg',
        )}
      >
        <h2
          id={titleId}
          className="font-heading text-lg font-semibold text-foreground"
        >
          {title}
        </h2>
        <div
          id={descriptionId}
          className="mt-2 space-y-2 text-sm text-muted-foreground"
        >
          {typeof description === 'string' ? <p>{description}</p> : description}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            className={
              destructive
                ? 'bg-danger text-danger-foreground hover:bg-danger/90'
                : undefined
            }
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
