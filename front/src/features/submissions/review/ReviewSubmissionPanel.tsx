import type { HumanReadableSubmissionSummary } from '@/types/submission'

interface ReviewSubmissionPanelProps {
  summary: HumanReadableSubmissionSummary
}

/**
 * Read-only review content before submit.
 * Editing happens by closing review and using summary / contribution cards.
 */
export function ReviewSubmissionPanel({ summary }: ReviewSubmissionPanelProps) {
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
    </div>
  )
}
