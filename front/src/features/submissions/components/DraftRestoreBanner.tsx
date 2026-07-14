import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'

interface DraftRestoreBannerProps {
  visible: boolean
  onContinue: () => void
  onDiscard: () => void
}

/**
 * Milestone 1 scaffold: UI for continuing or discarding a local draft.
 * Full restore polish belongs to a later milestone.
 */
export function DraftRestoreBanner({
  visible,
  onContinue,
  onDiscard,
}: DraftRestoreBannerProps) {
  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Saved draft available"
      className="flex flex-col gap-3 rounded-xl border border-pending/30 bg-pending-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-pending"
          aria-hidden="true"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div>
          <p className="font-heading text-sm font-semibold text-foreground">
            Continue previous submission?
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            We found a draft saved on this device. Continue where you left off,
            or discard it and start fresh.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:shrink-0">
        <Button type="button" variant="primary" size="sm" onClick={onContinue}>
          Continue previous submission
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDiscard}>
          Discard draft
        </Button>
      </div>
    </div>
  )
}
