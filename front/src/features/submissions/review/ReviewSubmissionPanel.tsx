import { useId } from 'react'
import { cn } from '@/utils/cn'
import type { HumanReadableSubmissionSummary } from '@/types/submission'

interface ReviewSubmissionPanelProps {
  summary: HumanReadableSubmissionSummary
  consent: boolean
  showConsentError: boolean
  onConsentChange: (consent: boolean) => void
  consentDisabled?: boolean
}

/**
 * Read-only review content for Milestone 5.
 * Editing happens by closing review and using summary / contribution cards.
 * Final submit is intentionally not wired to the backend yet.
 */
export function ReviewSubmissionPanel({
  summary,
  consent,
  showConsentError,
  onConsentChange,
  consentDisabled = false,
}: ReviewSubmissionPanelProps) {
  const consentId = useId()
  const consentErrorId = useId()

  return (
    <div className="space-y-8">
      <section aria-labelledby="review-contributor-heading" className="space-y-3">
        <h3
          id="review-contributor-heading"
          className="font-heading text-base font-semibold text-foreground"
        >
          Your information
        </h3>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium text-foreground">
              {summary.contributor.name}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium text-foreground">
              {summary.contributor.email}
            </dd>
          </div>
          {summary.contributor.phone ? (
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium text-foreground">
                {summary.contributor.phone}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Preferred contact</dt>
            <dd className="font-medium text-foreground">
              {summary.contributor.preferredContactLabel}
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="review-contributions-heading"
        className="space-y-4"
      >
        <h3
          id="review-contributions-heading"
          className="font-heading text-base font-semibold text-foreground"
        >
          Contributions
        </h3>
        <ol className="space-y-4">
          {summary.contributions.map((item, index) => (
            <li
              key={item.id}
              className="border-t border-border-subtle pt-4 first:border-t-0 first:pt-0"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {index + 1}. {item.typeLabel}
              </p>
              <p className="mt-1 font-heading text-base font-semibold text-foreground">
                {item.title}
              </p>
              {item.lines.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {item.lines.map((line) => (
                    <li key={`${item.id}-${line}`}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="review-consent-heading"
        className="space-y-3 border-t border-border pt-6"
      >
        <h3
          id="review-consent-heading"
          className="font-heading text-base font-semibold text-foreground"
        >
          Confirmation
        </h3>
        <label
          htmlFor={consentId}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors',
            consent
              ? 'border-interactive bg-interactive-muted'
              : 'border-border hover:border-interactive/50',
            'focus-within:ring-2 focus-within:ring-interactive/40',
            showConsentError && !consent ? 'border-destructive' : null,
          )}
        >
          <input
            id={consentId}
            type="checkbox"
            checked={consent}
            disabled={consentDisabled}
            onChange={(event) => onConsentChange(event.target.checked)}
            aria-invalid={showConsentError && !consent ? true : undefined}
            aria-describedby={
              showConsentError && !consent ? consentErrorId : undefined
            }
            className="mt-0.5 rounded border-border"
          />
          <span className="leading-relaxed text-foreground">
            I confirm that the information provided is accurate to the best of
            my knowledge.
          </span>
        </label>
        {showConsentError && !consent ? (
          <p
            id={consentErrorId}
            role="alert"
            className="text-sm text-destructive"
          >
            Confirm the information is accurate before submitting.
          </p>
        ) : null}
      </section>
    </div>
  )
}
