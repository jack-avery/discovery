import { useId, useMemo } from 'react'
import { cn } from '@/utils/cn'
import { useCategories } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import type {
  ContributorInfo,
  ExistingResourceData,
} from '@/types/submission'
import { preferredContactLabel } from '../contributor/emptyState'
import { RELATIONSHIP_LABELS } from '../mappers/labels'
import { buildResourceUpdateComparison } from './buildResourceUpdateComparison'
import { ResourceUpdateComparisonView } from './ResourceUpdateComparisonView'
import type { UpdateSectionId } from './updateSections'

interface ReviewResourceUpdatePanelProps {
  baseline: ExistingResourceData
  proposed: ExistingResourceData
  contributor: ContributorInfo
  consent: boolean
  showConsentError: boolean
  onConsentChange: (consent: boolean) => void
  onEditSection: (sectionId: UpdateSectionId) => void
  consentDisabled?: boolean
}

/**
 * Contributor-facing review for an update request.
 * Comparison UI is reusable; consent/contributor chrome stay here.
 */
export function ReviewResourceUpdatePanel({
  baseline,
  proposed,
  contributor,
  consent,
  showConsentError,
  onConsentChange,
  onEditSection,
  consentDisabled = false,
}: ReviewResourceUpdatePanelProps) {
  const consentId = useId()
  const consentErrorId = useId()
  const { categories } = useCategories()
  const { tags } = useTags()

  const comparison = useMemo(() => {
    const categoryNames = Object.fromEntries(
      categories.map((category) => [category.category_id, category.name]),
    )
    const tagNames = Object.fromEntries(
      tags.map((tag) => [tag.tag_id, tag.name]),
    )
    return buildResourceUpdateComparison(baseline, proposed, {
      categoryNames,
      tagNames,
    })
  }, [baseline, proposed, categories, tags])

  const connectionLabel = formatConnection(contributor)

  return (
    <div className="space-y-8">
      <section aria-labelledby="update-review-changes-heading" className="space-y-4">
        <div className="space-y-1">
          <h3
            id="update-review-changes-heading"
            className="font-heading text-base font-semibold text-foreground"
          >
            Your proposed changes
          </h3>
          <p className="text-sm text-muted-foreground">
            Only fields you changed are shown. Confirm each update before
            submitting.
          </p>
        </div>
        <ResourceUpdateComparisonView
          comparison={comparison}
          onEditSection={onEditSection}
        />
      </section>

      <section
        aria-labelledby="update-review-contributor-heading"
        className="space-y-3 border-t border-border-subtle pt-6"
      >
        <h3
          id="update-review-contributor-heading"
          className="font-heading text-base font-semibold text-foreground"
        >
          Your information
        </h3>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium text-foreground">
              {contributor.name.trim() || 'Not provided'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium text-foreground">
              {contributor.email.trim() || 'Not provided'}
            </dd>
          </div>
          {contributor.phone.trim() ? (
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium text-foreground">
                {contributor.phone.trim()}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Preferred contact</dt>
            <dd className="font-medium text-foreground">
              {preferredContactLabel(contributor.preferredContactMethod)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Connection to this resource</dt>
            <dd className="font-medium text-foreground">{connectionLabel}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="update-review-consent-heading"
        className="space-y-3 border-t border-border pt-6"
      >
        <h3
          id="update-review-consent-heading"
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

function formatConnection(contributor: ContributorInfo): string {
  if (!contributor.relationship) return 'Not provided'
  if (
    contributor.relationship === 'other' &&
    contributor.relationshipOther.trim()
  ) {
    return contributor.relationshipOther.trim()
  }
  return RELATIONSHIP_LABELS[contributor.relationship]
}
