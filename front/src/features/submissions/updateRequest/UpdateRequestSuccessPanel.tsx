import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui'

interface UpdateRequestSuccessPanelProps {
  resourceName?: string
  onDone: () => void
}

/**
 * Temporary in-sheet success after an update request is prepared (no API yet).
 */
export function UpdateRequestSuccessPanel({
  resourceName,
  onDone,
}: UpdateRequestSuccessPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section
      aria-labelledby="update-request-success-heading"
      className="space-y-6"
    >
      <div className="space-y-3">
        <h2
          id="update-request-success-heading"
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-2xl font-semibold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
        >
          Update request ready
        </h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            {resourceName
              ? `Your proposed updates for ${resourceName} have been prepared for review.`
              : 'Your proposed updates have been prepared for review.'}
          </p>
          <p>
            In a later step, this request will be sent to RRCRC staff. For now,
            nothing has been submitted to the server.
          </p>
        </div>
      </div>

      <Button type="button" variant="primary" onClick={onDone}>
        Done
      </Button>
    </section>
  )
}
