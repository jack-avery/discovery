import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui'
import { APP_BRANDING } from '@/config/appBranding'

interface SubmissionSuccessPanelProps {
  onSubmitAnother: () => void
}

/**
 * Full-success experience after every contribution is accepted by the backend.
 */
export function SubmissionSuccessPanel({
  onSubmitAnother,
}: SubmissionSuccessPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section
      aria-labelledby="submission-success-heading"
      className="mx-auto w-full max-w-xl space-y-6 text-center sm:text-left"
    >
      <div className="space-y-3">
        <h2
          id="submission-success-heading"
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-2xl font-semibold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-interactive/40 sm:text-3xl"
        >
          Thank you for submitting!
        </h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>All submissions are reviewed by our staff.</p>
          <p>You may be contacted if more information is needed.</p>
          <p>
            Once approved, your contribution will appear on the{' '}
            {APP_BRANDING.communityName} resource map.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button href="/" variant="primary" className="w-full sm:w-auto">
          Discover Resources
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={onSubmitAnother}
        >
          Submit another contribution
        </Button>
      </div>
    </section>
  )
}
