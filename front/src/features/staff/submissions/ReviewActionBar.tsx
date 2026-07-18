import { Button } from '@/components/ui'
import { Loader2 } from 'lucide-react'

interface ReviewActionBarProps {
  disabled?: boolean
  isSubmitting?: boolean
  onReject: () => void
  onApprove: () => void
}

/**
 * Sticky footer actions for approve / reject.
 */
export function ReviewActionBar({
  disabled = false,
  isSubmitting = false,
  onReject,
  onApprove,
}: ReviewActionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-surface/90">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onReject}
          disabled={disabled || isSubmitting}
          className="border-danger/40 text-danger hover:border-danger hover:text-danger"
        >
          Reject
        </Button>
        <Button
          type="button"
          variant="interactive"
          onClick={onApprove}
          disabled={disabled || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            'Approve'
          )}
        </Button>
      </div>
    </div>
  )
}
