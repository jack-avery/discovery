import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui'
import type { UpdateSubmissionOutcome } from './resolveUpdateSubmissionOutcome'

interface UpdateRequestSuccessPanelProps {
  outcome: UpdateSubmissionOutcome
  onDone: () => void
}

/**
 * Shared Update Resource success confirmation.
 * Supports pending review and published variants; the workspace picks via
 * {@link resolveUpdateSubmissionOutcome}.
 *
 * TODO(update-resource): Rename to UpdateResourceSuccessPanel when aligning
 * internal names with product terminology.
 */
export function UpdateRequestSuccessPanel({
  outcome,
  onDone,
}: UpdateRequestSuccessPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [outcome])

  const copy = SUCCESS_COPY[outcome]

  return (
    <section
      aria-labelledby="update-resource-success-heading"
      className="space-y-6"
    >
      <div className="space-y-3">
        <h2
          id="update-resource-success-heading"
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-2xl font-semibold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
        >
          {copy.heading}
        </h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {copy.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <Button type="button" variant="primary" onClick={onDone}>
        Done
      </Button>
    </section>
  )
}

const SUCCESS_COPY: Record<
  UpdateSubmissionOutcome,
  { heading: string; paragraphs: string[] }
> = {
  pending_review: {
    heading: 'Thank you!',
    paragraphs: [
      'Your resource update has been submitted for review.',
      'We appreciate you taking the time to help keep this resource accurate for the community.',
      'Suggested changes appear on the map after our team reviews them.',
    ],
  },
  // Ready for backend auto-approval; not reached until moderation_status is returned.
  published: {
    heading: 'Resource updated successfully.',
    paragraphs: [
      'Your changes are live on the map.',
      'Thank you for helping keep this resource accurate for the community.',
    ],
  },
}
