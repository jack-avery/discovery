import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Contact,
  FileText,
  type LucideIcon,
  UserRound,
} from 'lucide-react'
import { Badge } from '@/components/ui'
import {
  buildSkillsFollowUpDetailView,
  type SkillsFollowUpDetailField,
  type SkillsFollowUpDetailSection,
  type SkillsFollowUpDetailViewModel,
} from '@/features/staff/skillsFollowUps/buildSkillsFollowUpDetailView'
import { SkillsFollowUpStaffSection } from '@/features/staff/skillsFollowUps/SkillsFollowUpStaffSection'
import { fetchSkillsFollowUpById } from '@/services/skillsFollowUpService'
import type { SkillsFollowUpDetailDto } from '@/types/skillsFollowUp'
import { toUserFacingErrorMessage } from '@/utils/userFacingError'
import { cn } from '@/utils/cn'

interface SkillsFollowUpDetailPanelProps {
  followUpId: number
  /** List-row status so the staff section can stay aligned after table edits. */
  listStatus?: string
  onFollowUpUpdated?: () => void
}

/**
 * Lazy-loaded detail for one follow-up — unified expanded-record layout with
 * subtle visual hierarchy (typography, tinted quick-info, left accents).
 */
export function SkillsFollowUpDetailPanel({
  followUpId,
  listStatus,
  onFollowUpUpdated,
}: SkillsFollowUpDetailPanelProps) {
  const [detail, setDetail] = useState<SkillsFollowUpDetailDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)
    setDetail(null)

    fetchSkillsFollowUpById(followUpId, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        setDetail(result)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (err instanceof Error && err.name === 'AbortError') return
        setError(
          toUserFacingErrorMessage(err, {
            fallback: "We couldn't load follow-up details. Please try again.",
            context: 'skills-follow-up-detail',
          }),
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [followUpId])

  const previousListStatusRef = useRef(listStatus)

  // When the list row status changes (table control), refresh detail so the
  // staff section reflects the same status without collapsing the row.
  useEffect(() => {
    const previous = previousListStatusRef.current
    previousListStatusRef.current = listStatus
    if (
      listStatus === undefined ||
      previous === undefined ||
      listStatus === previous
    ) {
      return
    }
    const controller = new AbortController()
    fetchSkillsFollowUpById(followUpId, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setDetail(result)
      })
      .catch(() => {
        /* keep existing detail; list reload already owns error feedback */
      })
    return () => controller.abort()
  }, [listStatus, followUpId])

  const view = useMemo(
    () => (detail ? buildSkillsFollowUpDetailView(detail) : null),
    [detail],
  )

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading details…
      </p>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    )
  }

  if (!detail || !view) {
    return null
  }

  const handleDetailUpdated = (updated: SkillsFollowUpDetailDto) => {
    setDetail(updated)
    onFollowUpUpdated?.()
  }

  return (
    <SkillsFollowUpDetailLayout
      view={view}
      detail={detail}
      followUpId={followUpId}
      onDetailUpdated={handleDetailUpdated}
    />
  )
}

function SkillsFollowUpDetailLayout({
  view,
  detail,
  followUpId,
  onDetailUpdated,
}: {
  view: SkillsFollowUpDetailViewModel
  detail: SkillsFollowUpDetailDto
  followUpId: number
  onDetailUpdated: (detail: SkillsFollowUpDetailDto) => void
}) {
  const byId = sectionLookup(view.sections)
  const contact = byId.get('contact')
  const availability = byId.get('availability')
  const languages = byId.get('languages')
  const aboutOffer = byId.get('about-offer')
  const aboutContributor = byId.get('about-contributor')
  const additional = byId.get('additional')

  const compactFields = buildCompactInfoFields({
    contact,
    availability,
    languages,
  })

  const majorBlocks: Array<{ key: string; node: ReactNode }> = []

  if (compactFields.length > 0) {
    majorBlocks.push({
      key: 'contact-availability',
      node: (
        <DetailSection
          title="Contact & availability"
          headingId={`follow-up-contact-availability-${followUpId}`}
          icon={Contact}
          surface="quick-info"
        >
          <CompactFieldGrid fields={compactFields} />
        </DetailSection>
      ),
    })
  }

  if (aboutOffer) {
    majorBlocks.push({
      key: 'about-offer',
      node: (
        <DetailSection
          title={aboutOffer.title}
          headingId={`follow-up-about-offer-${followUpId}`}
          icon={FileText}
        >
          <LongFormFields fields={aboutOffer.fields} />
        </DetailSection>
      ),
    })
  }

  if (aboutContributor) {
    majorBlocks.push({
      key: 'about-contributor',
      node: (
        <DetailSection
          title={aboutContributor.title}
          headingId={`follow-up-about-contributor-${followUpId}`}
          icon={UserRound}
        >
          <LongFormFields fields={aboutContributor.fields} />
        </DetailSection>
      ),
    })
  }

  if (additional) {
    majorBlocks.push({
      key: 'additional',
      node: (
        <DetailSection
          title={additional.title}
          headingId={`follow-up-additional-${followUpId}`}
          icon={FileText}
        >
          <LongFormFields fields={additional.fields} />
        </DetailSection>
      ),
    })
  }

  return (
    <div className="min-w-0 space-y-6">
      {majorBlocks.length === 0 ? (
        <p className="text-sm text-muted-foreground" role="status">
          No contributor details were returned for this follow-up.
        </p>
      ) : (
        majorBlocks.map((block, index) => (
          <div key={block.key} className="min-w-0">
            {index > 0 ? (
              <div
                className="mb-6 border-t border-border"
                role="presentation"
                aria-hidden="true"
              />
            ) : null}
            {block.node}
          </div>
        ))
      )}

      <div className="min-w-0 border-t border-border pt-6">
        <SkillsFollowUpStaffSection
          detail={detail}
          onUpdated={onDetailUpdated}
        />
      </div>
    </div>
  )
}

function sectionLookup(sections: SkillsFollowUpDetailSection[]) {
  return new Map(sections.map((section) => [section.id, section]))
}

/**
 * Flatten contact + availability + languages into one flowing field list.
 * Empty fields are already omitted by the view model; we also skip empty
 * language chip lists so the grid never reserves blank cells.
 */
function buildCompactInfoFields({
  contact,
  availability,
  languages,
}: {
  contact: SkillsFollowUpDetailSection | undefined
  availability: SkillsFollowUpDetailSection | undefined
  languages: SkillsFollowUpDetailSection | undefined
}): CompactInfoField[] {
  const fields: CompactInfoField[] = []

  for (const field of contact?.fields ?? []) {
    fields.push({ kind: 'text', field })
  }

  for (const field of availability?.fields ?? []) {
    fields.push({ kind: 'text', field })
  }

  const languageValue =
    languages?.fields.find((field) => field.id === 'languages')?.value ??
    languages?.fields[0]?.value

  if (languageValue && splitLanguageValues(languageValue).length > 0) {
    fields.push({
      kind: 'languages',
      id: 'languages',
      label: 'Languages',
      value: languageValue,
    })
  }

  return fields
}

type CompactInfoField =
  | { kind: 'text'; field: SkillsFollowUpDetailField }
  | { kind: 'languages'; id: string; label: string; value: string }

function DetailSection({
  title,
  headingId,
  icon: Icon,
  surface = 'plain',
  children,
}: {
  title: string
  headingId: string
  icon: LucideIcon
  /** Subtle tint only for the compact quick-info block. */
  surface?: 'plain' | 'quick-info'
  children: ReactNode
}) {
  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-interactive-muted text-interactive"
          aria-hidden="true"
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <h3
          id={headingId}
          className="text-xs font-semibold uppercase tracking-wide text-foreground"
        >
          {title}
        </h3>
      </div>

      {surface === 'quick-info' ? (
        <div className="rounded-lg bg-muted/40 px-3.5 py-3 sm:px-4 sm:py-3.5">
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  )
}

/**
 * Responsive 2-column auto-flow grid. Missing fields do not leave empty cells.
 */
function CompactFieldGrid({ fields }: { fields: CompactInfoField[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
      {fields.map((entry) => {
        if (entry.kind === 'languages') {
          return (
            <div key={entry.id} className="min-w-0">
              <dt className="text-[11px] font-medium text-muted-foreground">
                {entry.label}
              </dt>
              <dd className="mt-1 min-w-0">
                <LanguageChips value={entry.value} />
              </dd>
            </div>
          )
        }

        const { field } = entry
        return (
          <div key={field.id} className="min-w-0">
            <dt className="text-[11px] font-medium text-muted-foreground">
              {field.label}
            </dt>
            <dd className="mt-1 min-w-0 text-sm leading-relaxed text-foreground">
              <FieldValue field={field} />
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** Full-width stacked long-form fields with left accent on answers. */
function LongFormFields({ fields }: { fields: SkillsFollowUpDetailField[] }) {
  return (
    <dl className="min-w-0 space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="min-w-0">
          <dt className="text-[11px] font-medium text-muted-foreground">
            {field.label}
          </dt>
          <dd className="mt-1.5 min-w-0 border-l-2 border-interactive/40 pl-3 text-sm leading-relaxed text-foreground">
            <FieldValue field={field} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function LanguageChips({ value }: { value: string }) {
  const languages = splitLanguageValues(value)
  if (languages.length === 0) return null

  return (
    <ul
      className="m-0 flex list-none flex-wrap gap-1.5 p-0"
      aria-label="Languages"
    >
      {languages.map((language) => (
        <li key={language}>
          <Badge variant="outline">{formatLanguageChipLabel(language)}</Badge>
        </li>
      ))}
    </ul>
  )
}

function splitLanguageValues(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Title-case words for chip display only. */
function formatLanguageChipLabel(value: string): string {
  return value
    .split(/\s+/)
    .map((word) =>
      word.length === 0
        ? word
        : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
    )
    .join(' ')
}

function FieldValue({ field }: { field: SkillsFollowUpDetailField }) {
  if (field.href) {
    return (
      <a
        href={field.href}
        className={cn(
          'text-interactive underline-offset-2 hover:underline',
          field.id === 'email' && 'break-all',
        )}
      >
        {field.value}
      </a>
    )
  }

  return <p className="whitespace-pre-wrap break-words">{field.value}</p>
}
