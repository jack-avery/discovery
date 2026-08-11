import { useCallback, useEffect, useId, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import {
  ConvertedResourcePicker,
  type ConvertedResourceSelection,
} from '@/features/staff/skillsFollowUps/ConvertedResourcePicker'
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility'
import { cn } from '@/utils/cn'

export type ConvertToResourceDialogMode = 'convert' | 'change'

interface ConvertToResourceDialogProps {
  open: boolean
  mode: ConvertToResourceDialogMode
  isSubmitting?: boolean
  /** Prefill when changing an existing linked resource. */
  initialSelection?: ConvertedResourceSelection | null
  onCancel: () => void
  onConfirm: (selection: ConvertedResourceSelection) => void
}

/**
 * Accessible dialog for linking (or re-linking) a Skills Follow-up to a
 * published resource. Search/selection lives in {@link ConvertedResourcePicker}.
 */
export function ConvertToResourceDialog({
  open,
  mode,
  isSubmitting = false,
  initialSelection = null,
  onCancel,
  onConfirm,
}: ConvertToResourceDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const [selection, setSelection] = useState<ConvertedResourceSelection | null>(
    null,
  )
  const [pickerKey, setPickerKey] = useState(0)

  const containerRef = useDialogAccessibility({
    open,
    onDismiss: onCancel,
    dismissDisabled: isSubmitting,
  })

  useEffect(() => {
    if (!open) return
    setSelection(initialSelection)
    setPickerKey((value) => value + 1)
  }, [open, initialSelection, mode])

  const handleSelectionChange = useCallback(
    (next: ConvertedResourceSelection | null) => {
      setSelection(next)
    },
    [],
  )

  if (!open) return null

  const title =
    mode === 'change' ? 'Change Linked Resource' : 'Convert to Resource'
  const description =
    mode === 'change'
      ? 'Choose the resource that should be linked to this follow-up.'
      : 'Link this follow-up to the resource that was created from it.'
  const confirmLabel =
    mode === 'change' ? 'Save Resource' : 'Convert to Resource'
  const canConfirm = selection != null && !isSubmitting

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
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          'relative z-10 flex max-h-[min(36rem,90vh)] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-lg',
        )}
      >
        <div className="shrink-0 border-b border-border px-5 py-4">
          <h2
            id={titleId}
            className="font-heading text-lg font-semibold text-foreground"
          >
            {title}
          </h2>
          <p id={descriptionId} className="mt-1.5 text-sm text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
          <ConvertedResourcePicker
            key={pickerKey}
            initialSelection={initialSelection}
            isSaving={isSubmitting}
            onSelectionChange={handleSelectionChange}
          />
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!canConfirm}
            onClick={() => {
              if (!selection) return
              onConfirm(selection)
            }}
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
