import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui'

interface UpdateRequestSuccessPanelProps {
  onDone: () => void
}

/**
 * Confirmation after a public update request is submitted.
 * Stays visible until the contributor chooses Done.
 */
export function UpdateRequestSuccessPanel({
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
          Thank you!
        </h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>Your update request has been submitted.</p>
          <p>
            We appreciate you taking the time to help keep this resource accurate
            for the community.
          </p>
          <p>
            Our team will review your suggested changes before they appear on the
            map.
          </p>
        </div>
      </div>

      <Button type="button" variant="primary" onClick={onDone}>
        Done
      </Button>
    </section>
  )
}
