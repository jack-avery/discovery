import {
  Clock,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { Badge } from '@/components/ui'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'
import { useWorkspaceNavigation } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { useResourceDetail } from '@/hooks/useResourceDetail'
import type {
  ResourceContactDto,
  ResourceDetail,
  ResourceHourDto,
  ResourceLocationDto,
} from '@/types/resource'

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

/** Presentation-only: format backend ISO timestamps for display. */
function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Presentation-only: truncate backend time strings like "09:00:00". */
function formatTime(value: string | null): string | null {
  if (!value) return null
  return value.length >= 5 ? value.slice(0, 5) : value
}

function formatHourLine(hour: ResourceHourDto): string {
  const day = DAY_LABELS[hour.day_of_week] ?? `Day ${hour.day_of_week}`
  if (hour.is_closed) return `${day}: Closed`
  if (hour.by_appointment_only) return `${day}: By appointment`
  const opens = formatTime(hour.opens_at)
  const closes = formatTime(hour.closes_at)
  if (opens && closes) return `${day}: ${opens} – ${closes}`
  if (opens) return `${day}: Opens ${opens}`
  if (closes) return `${day}: Closes ${closes}`
  return day
}

function formatLocationAddress(location: ResourceLocationDto): string {
  return [
    location.address_line1,
    location.address_line2,
    [location.city, location.province].filter(Boolean).join(', '),
    location.postal_code,
    location.country,
  ]
    .filter((part) => Boolean(part && String(part).trim()))
    .join(', ')
}

function contactHref(contact: ResourceContactDto): string | null {
  const type = contact.contact_type.toLowerCase()
  const value = contact.contact_value.trim()
  if (!value) return null
  if (type.includes('email') || value.includes('@')) return `mailto:${value}`
  if (type.includes('phone') || type.includes('tel')) {
    return `tel:${value.replace(/[^\d+]/g, '')}`
  }
  if (type.includes('web') || type.includes('url') || /^https?:\/\//i.test(value)) {
    return value.startsWith('http') ? value : `https://${value}`
  }
  return null
}

function hasText(value: string | null | undefined): value is string {
  return Boolean(value && value.trim())
}

/**
 * Live resource detail workspace screen.
 * Fetches via useResourceDetail — presentational only (no fetch).
 */
export function ResourceDetailScreen() {
  const { current } = useWorkspaceNavigation()
  const resourceId =
    current.id === 'resource-detail' && typeof current.params?.resourceId === 'string'
      ? current.params.resourceId
      : null

  const { resource, isLoading, error } = useResourceDetail(resourceId)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
      <div className="workspace-content flex-1">
        {!resourceId ? (
          <EmptyState
            title="No resource selected"
            description="Select a resource from the map or results list to view its details."
            icon={<FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
            className="py-12"
          />
        ) : isLoading ? (
          <div
            className="flex items-center justify-center py-16"
            role="status"
            aria-label="Loading resource details"
          >
            <Loader2 className="h-6 w-6 animate-spin text-interactive" aria-hidden="true" />
            <span className="sr-only">Loading resource details</span>
          </div>
        ) : error ? (
          <EmptyState
            title="Unable to load resource"
            description={error}
            icon={<FileText className="h-6 w-6 text-danger" strokeWidth={1.5} />}
            className="py-12"
          />
        ) : resource ? (
          <ResourceDetailContent resource={resource} />
        ) : (
          <EmptyState
            title="Resource not found"
            description="This resource may have been removed or is not available."
            icon={<FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
            className="py-12"
          />
        )}
      </div>
    </div>
  )
}

function ResourceDetailContent({ resource }: { resource: ResourceDetail }) {
  const { version } = resource
  const categories = version.categories.filter((c) => hasText(c.name))
  const tags = version.tags.filter((t) => hasText(t.name))
  const locations = version.locations
  const contacts = version.contacts.filter((c) => hasText(c.contact_value))
  const hours = [...version.hours].sort((a, b) => a.day_of_week - b.day_of_week)

  const approvedAt = formatDate(version.approved_at)
  const submittedAt = formatDate(version.submitted_at)
  const expiresAt = formatDate(version.expires_at)
  const hasVerification = Boolean(approvedAt || submittedAt || expiresAt || version.moderation_status)

  return (
    <div className="flex flex-col gap-[var(--ds-workspace-section-gap)]">
      <WorkspaceSection divider>
        <div className="space-y-2">
          <h3 className="font-heading text-lg font-semibold text-foreground">{version.name}</h3>
          {version.resource_type && (
            <p className="text-sm text-muted-foreground">{version.resource_type}</p>
          )}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {categories.map((category) => (
                <Badge
                  key={category.category_id}
                  variant={category.is_primary ? 'default' : 'outline'}
                >
                  {category.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </WorkspaceSection>

      {hasText(version.description) && (
        <WorkspaceSection title="About">
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {version.description}
          </p>
        </WorkspaceSection>
      )}

      {hasText(version.eligibility) && (
        <WorkspaceSection title="Eligibility">
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {version.eligibility}
          </p>
        </WorkspaceSection>
      )}

      {hasText(version.cost_description) && (
        <WorkspaceSection title="Cost">
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {version.cost_description}
          </p>
        </WorkspaceSection>
      )}

      {hasText(version.accessibility_notes) && (
        <WorkspaceSection title="Accessibility">
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {version.accessibility_notes}
          </p>
        </WorkspaceSection>
      )}

      {hasText(version.general_notes) && (
        <WorkspaceSection title="Notes">
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {version.general_notes}
          </p>
        </WorkspaceSection>
      )}

      {locations.length > 0 && (
        <WorkspaceSection title="Locations">
          <ul className="space-y-3 p-0 list-none">
            {locations.map((location) => (
              <LocationRow key={location.location_id} location={location} />
            ))}
          </ul>
        </WorkspaceSection>
      )}

      {contacts.length > 0 && (
        <WorkspaceSection title="Contact">
          <ul className="space-y-2 p-0 list-none">
            {contacts.map((contact) => (
              <ContactRow key={contact.contact_id} contact={contact} />
            ))}
          </ul>
        </WorkspaceSection>
      )}

      {hours.length > 0 && (
        <WorkspaceSection title="Hours">
          <ul className="space-y-1.5 p-0 list-none text-sm text-muted-foreground">
            {hours.map((hour) => (
              <li key={hour.day_of_week} className="flex items-start gap-2">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {formatHourLine(hour)}
                  {hasText(hour.notes) ? ` — ${hour.notes}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </WorkspaceSection>
      )}

      {tags.length > 0 && (
        <WorkspaceSection title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag.tag_id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>
        </WorkspaceSection>
      )}

      {hasText(version.image_url) && (
        <WorkspaceSection title="Image">
          <a
            href={version.image_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-interactive hover:underline break-all"
          >
            {version.image_url}
          </a>
        </WorkspaceSection>
      )}

      {hasVerification && (
        <WorkspaceSection title="Verification">
          <ul className="space-y-1.5 p-0 list-none text-sm text-muted-foreground">
            {version.moderation_status && (
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Status: {version.moderation_status.replace(/_/g, ' ')}</span>
              </li>
            )}
            {approvedAt && <li>Approved: {approvedAt}</li>}
            {submittedAt && <li>Submitted: {submittedAt}</li>}
            {expiresAt && <li>Expires: {expiresAt}</li>}
          </ul>
        </WorkspaceSection>
      )}
    </div>
  )
}

function LocationRow({ location }: { location: ResourceLocationDto }) {
  const address = formatLocationAddress(location)
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-0.5">
        {hasText(location.location_name) && (
          <p className="font-medium text-foreground">{location.location_name}</p>
        )}
        {address && <p>{address}</p>}
        {location.is_virtual && <p className="text-xs">Virtual / online</p>}
        {hasText(location.service_area_notes) && (
          <p className="text-xs">{location.service_area_notes}</p>
        )}
      </div>
    </li>
  )
}

function ContactRow({ contact }: { contact: ResourceContactDto }) {
  const href = contactHref(contact)
  const type = contact.contact_type.toLowerCase()
  const Icon = type.includes('email')
    ? Mail
    : type.includes('web') || type.includes('url')
      ? Globe
      : Phone

  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {hasText(contact.contact_label) && (
          <p className="text-xs text-muted-foreground">{contact.contact_label}</p>
        )}
        {href ? (
          <a href={href} className="text-interactive hover:underline break-all" {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
            {contact.contact_value}
          </a>
        ) : (
          <span className="break-all">{contact.contact_value}</span>
        )}
      </div>
    </li>
  )
}
