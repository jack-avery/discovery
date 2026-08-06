import type { ReactNode } from 'react'
import { Button, Input, Textarea } from '@/components/ui'
import type {
  ResourceUpdateComparison,
  ResourceUpdateComparisonField,
  ResourceUpdateComparisonSection,
} from './buildResourceUpdateComparison'
import type { UpdateSectionId } from './updateSections'
import { cn } from '@/utils/cn'

/**
 * Field-level Current → Proposed comparison for Resource Updates.
 * Supports read-only presentation and interactive staff review.
 */

export interface ResourceUpdateComparisonReviewHandlers {
  accepted: Record<string, boolean>
  onAcceptedChange: (fieldId: string, accepted: boolean) => void
  getProposedValue: (fieldId: string, originalProposed: string) => string
  onProposedChange: (fieldId: string, value: string) => void
  isFieldEdited: (fieldId: string) => boolean
  onResetField: (fieldId: string) => void
  /**
   * Optional structured proposed control (contacts / locations / hours).
   * Return a node to replace the default input/textarea; return null to fall back.
   */
  renderProposedControl?: (args: {
    field: ResourceUpdateComparisonField
    disabled: boolean
    controlId: string
  }) => ReactNode | null
  /** Shared validation message for this comparison field, when shown. */
  getFieldError?: (fieldId: string) => string | undefined
}

interface ResourceUpdateComparisonViewProps {
  comparison: ResourceUpdateComparison
  /**
   * When false (default), only changed fields are shown.
   * Unchanged fields are revealed when true (baseline required).
   */
  showUnchanged?: boolean
  /**
   * Optional per-section edit action for hosts that jump back into an editor.
   * Omit when presentation-only (e.g. staff change review).
   */
  onEditSection?: (sectionId: UpdateSectionId) => void
  /** Interactive staff review controls. Omit for read-only comparison. */
  review?: ResourceUpdateComparisonReviewHandlers
  /** Shown when there are no visible sections after filtering. */
  emptyMessage?: string
}

function changeCountLabel(count: number): string {
  return count === 1 ? '1 change' : `${count} changes`
}

function prefersMultiline(field: ResourceUpdateComparisonField): boolean {
  if (field.proposed.includes('\n')) return true
  if (field.current?.includes('\n')) return true
  const key = field.id.split(':')[1] ?? ''
  return (
    key === 'description' ||
    key === 'generalNotes' ||
    key === 'hours' ||
    key === 'contacts' ||
    key === 'locations' ||
    key === 'websites' ||
    key === 'accessibilityNotes' ||
    key === 'eligibility'
  )
}

/**
 * Current → Proposed comparison with optional staff review editing.
 */
export function ResourceUpdateComparisonView({
  comparison,
  showUnchanged = false,
  onEditSection,
  review,
  emptyMessage = 'No changes to review yet.',
}: ResourceUpdateComparisonViewProps) {
  const visibleSections = comparison.sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter(
        (field) => showUnchanged || field.changed || !comparison.hasBaseline,
      ),
    }))
    .filter((section) => section.fields.length > 0)

  if (visibleSections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {visibleSections.map((section) => (
        <ComparisonSection
          key={section.id}
          section={section}
          review={review}
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
  review,
}: {
  section: ResourceUpdateComparisonSection
  onEdit?: () => void
  review?: ResourceUpdateComparisonReviewHandlers
}) {
  const headingId = `update-compare-${section.id}`
  const visibleChangeCount = section.fields.filter((f) => f.changed).length

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
          {section.label}{' '}
          <span className="font-normal text-muted-foreground">
            ({changeCountLabel(visibleChangeCount)})
          </span>
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
      <div className="space-y-5">
        {section.fields.map((field) => (
          <FieldComparison key={field.id} field={field} review={review} />
        ))}
      </div>
    </section>
  )
}

function FieldComparison({
  field,
  review,
}: {
  field: ResourceUpdateComparisonField
  review?: ResourceUpdateComparisonReviewHandlers
}) {
  const showCurrent = field.currentAvailable && field.current != null
  const interactive = review != null
  const useProposed = review ? review.accepted[field.id] !== false : true
  const proposedValue = review
    ? review.getProposedValue(field.id, field.proposed)
    : field.proposed
  const isEdited = review?.isFieldEdited(field.id) ?? false
  const proposedEditable = interactive && useProposed
  const multiline = prefersMultiline(field)
  const proposedControlId = `proposed-${field.id}`
  const acceptControlId = `accept-${field.id}`
  const structuredControl =
    interactive && review
      ? review.renderProposedControl?.({
          field,
          disabled: !proposedEditable,
          controlId: proposedControlId,
        })
      : null
  const fieldError = review?.getFieldError?.(field.id)

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {field.label}
          {!field.changed && field.currentAvailable ? (
            <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/80">
              Unchanged
            </span>
          ) : null}
        </p>
        {interactive && field.changed && field.currentAvailable ? (
          <label
            htmlFor={acceptControlId}
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground"
          >
            <input
              id={acceptControlId}
              type="checkbox"
              checked={useProposed}
              onChange={(event) =>
                review.onAcceptedChange(field.id, event.target.checked)
              }
              className="rounded border-border"
            />
            <span>Use proposed change</span>
          </label>
        ) : null}
      </div>

      <div className="space-y-2 text-sm">
        {showCurrent ? (
          <>
            <ComparisonValue
              label="Current"
              value={field.current!}
              muted
              readOnly
            />
            <p className="pl-1 text-muted-foreground" aria-hidden="true">
              ↓
            </p>
          </>
        ) : null}

        {interactive ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Proposed
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {isEdited && useProposed ? (
                  <span className="text-xs text-muted-foreground">
                    Edited by reviewer
                  </span>
                ) : null}
                {isEdited ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() => review.onResetField(field.id)}
                  >
                    Reset field
                  </Button>
                ) : null}
              </div>
            </div>
            {structuredControl != null ? (
              structuredControl
            ) : multiline ? (
              <Textarea
                id={proposedControlId}
                value={proposedValue === 'Not provided' ? '' : proposedValue}
                placeholder="Not provided"
                disabled={!proposedEditable}
                className={cn(
                  !proposedEditable && 'cursor-not-allowed opacity-60',
                )}
                onChange={(event) =>
                  review.onProposedChange(field.id, event.target.value)
                }
                aria-label={`Proposed ${field.label}`}
                aria-invalid={Boolean(fieldError)}
              />
            ) : (
              <Input
                id={proposedControlId}
                value={proposedValue === 'Not provided' ? '' : proposedValue}
                placeholder="Not provided"
                disabled={!proposedEditable}
                className={cn(
                  !proposedEditable && 'cursor-not-allowed opacity-60',
                )}
                onChange={(event) =>
                  review.onProposedChange(field.id, event.target.value)
                }
                aria-label={`Proposed ${field.label}`}
                aria-invalid={Boolean(fieldError)}
              />
            )}
            {fieldError && structuredControl == null ? (
              <p className="text-sm text-danger" role="alert">
                {fieldError}
              </p>
            ) : null}
          </div>
        ) : (
          <ComparisonValue
            label="Proposed"
            value={field.proposed}
            emphasized
          />
        )}
      </div>
    </div>
  )
}

function ComparisonValue({
  label,
  value,
  emphasized = false,
  muted = false,
  readOnly = false,
}: {
  label: string
  value: string
  emphasized?: boolean
  muted?: boolean
  readOnly?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg px-3 py-2',
        muted ? 'bg-muted/70 text-muted-foreground' : 'bg-muted/50',
        readOnly && 'cursor-not-allowed select-none',
      )}
      aria-readonly={readOnly || undefined}
    >
      <p
        className={cn(
          'text-xs font-medium',
          muted ? 'text-muted-foreground/80' : 'text-muted-foreground',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 whitespace-pre-wrap',
          muted ? 'text-muted-foreground' : 'text-foreground',
          emphasized && !muted && 'font-medium',
        )}
      >
        {value}
      </p>
    </div>
  )
}
