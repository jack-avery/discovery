import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui'
import type {
  ContributionSubmitFailure,
  ContributionSubmitSuccess,
} from '@/services/submissionService'

interface SubmissionOutcomePanelProps {
  kind: 'partial' | 'failure'
  succeeded: ContributionSubmitSuccess[]
  failed: ContributionSubmitFailure[]
  onRetryFailed: () => void
  onDismiss: () => void
  retrying?: boolean
}

/**
 * Calm outcome surface for partial success or full failure.
 * Does not expose backend IDs or transport jargon.
 */
export function SubmissionOutcomePanel({
  kind,
  succeeded,
  failed,
  onRetryFailed,
  onDismiss,
  retrying = false,
}: SubmissionOutcomePanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [kind, failed.length, succeeded.length])

  const heading =
    kind === 'partial'
      ? 'Some contributions were submitted'
      : 'We couldn’t submit your contributions'

  return (
    <section
      aria-labelledby="submission-outcome-heading"
      className="space-y-6"
    >
      <div className="space-y-2">
        <h3
          id="submission-outcome-heading"
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-lg font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
        >
          {heading}
        </h3>
        {kind === 'partial' ? (
          <p className="text-sm text-muted-foreground">
            Your unsent contribution
            {failed.length === 1 ? ' has' : 's have'} been kept so you can try
            again.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your information has been saved in this browser so you can try
            again.
          </p>
        )}
      </div>

      {succeeded.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">We received:</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {succeeded.map((item) => (
              <li key={item.contributionId}>{item.title}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {failed.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">
            We could not submit:
          </h4>
          <ul className="space-y-3">
            {failed.map((item) => (
              <li
                key={item.contributionId}
                className="rounded-xl border border-border-subtle bg-muted px-4 py-3 text-sm"
              >
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-muted-foreground">{item.message}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onDismiss}
          disabled={retrying}
        >
          Back to your contributions
        </Button>
        {failed.length > 0 ? (
          <Button
            type="button"
            variant="primary"
            onClick={onRetryFailed}
            disabled={retrying}
          >
            {retrying
              ? 'Submitting…'
              : 'Try unsent contributions again'}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
