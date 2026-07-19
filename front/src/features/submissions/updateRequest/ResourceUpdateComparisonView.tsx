import { Button } from '@/components/ui'
import type {
  ResourceUpdateComparison,
  ResourceUpdateComparisonField,
  ResourceUpdateComparisonSection,
} from './buildResourceUpdateComparison'
import type { UpdateSectionId } from './updateSections'

interface ResourceUpdateComparisonViewProps {
  comparison: ResourceUpdateComparison
  /**
   * Optional per-section edit action. Contributor review passes this;
   * staff moderation can omit it or supply a different handler later.
   */
  onEditSection?: (sectionId: UpdateSectionId) => void
  /** Section heading level wording. Defaults to contributor-facing copy. */
  emptyMessage?: string
}

/**
 * Presentation-only Current → Proposed comparison.
 * No consent, submit, or moderation actions — safe to reuse in staff review.
 */
export function ResourceUpdateComparisonView({
  comparison,
  onEditSection,
  emptyMessage = 'No changes to review yet.',
}: ResourceUpdateComparisonViewProps) {
  if (comparison.sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {comparison.sections.map((section) => (
        <ComparisonSection
          key={section.id}
          section={section}
          onEdit={
            onEditSection ? () => onEditSection(section.id) : undefined
          }
        />
      ))}
    </div>
  )
}

function ComparisonSection({
  section,
  onEdit,
}: {
  section: ResourceUpdateComparisonSection
  onEdit?: () => void
}) {
  const headingId = `update-compare-${section.id}`

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h4
          id={headingId}
          className="font-heading text-base font-semibold text-foreground"
        >
          {section.label}
        </h4>
        {onEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={onEdit}
          >
            Edit
          </Button>
        ) : null}
      </div>
      <div className="space-y-4">
        {section.fields.map((field) => (
          <FieldComparison key={field.id} field={field} />
        ))}
      </div>
    </section>
  )
}

function FieldComparison({ field }: { field: ResourceUpdateComparisonField }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {field.label}
      </p>
      <div className="space-y-2 text-sm">
        <ComparisonValue label="Current" value={field.current} />
        <p className="pl-1 text-muted-foreground" aria-hidden="true">
          ↓
        </p>
        <ComparisonValue label="Proposed" value={field.proposed} emphasized />
      </div>
    </div>
  )
}

function ComparisonValue({
  label,
  value,
  emphasized = false,
}: {
  label: string
  value: string
  emphasized?: boolean
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={
          emphasized
            ? 'mt-0.5 whitespace-pre-wrap font-medium text-foreground'
            : 'mt-0.5 whitespace-pre-wrap text-foreground'
        }
      >
        {value}
      </p>
    </div>
  )
}
