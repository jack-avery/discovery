import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Accessibility,
  Banknote,
  ChevronDown,
  Clock,
  FileText,
  Globe,
  Info,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Settings,
  Users,
} from 'lucide-react'
import resourcePlaceholder from '@/assets/resource-placeholder.svg'
import { EmptyState } from '@/components/shared'
import { Badge } from '@/components/ui'
import {
  DetailGlanceRow,
  DetailSectionCard,
} from '@/features/discover/DetailInfoCard'
import { mapResourceVersionForPresentation } from '@/features/discover/mapResourceVersionForPresentation'
import {
  externalHref,
  resolveOnlineLocationUrl,
} from '@/features/discover/locationPresentation'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'
import { useWorkspaceNavigation } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { RequestResourceUpdateFlow } from '@/features/submissions/updateRequest/RequestResourceUpdateFlow'
import { EventDetailPresentation } from '@/features/staff/submissions/EventDetailPresentation'
import { hasEventScheduleNotes } from '@/features/submissions/mappers/eventScheduleNotes'
import { mapEventVersionForPresentation } from '@/features/staff/submissions/mapEventVersionForPresentation'
import { useResourceDetail } from '@/hooks/useResourceDetail'
import type {
  ResourceContactDto,
  ResourceHourDto,
  ResourceLocationDto,
  ResourceVersionDto,
  ResourceVersionTagDto,
} from '@/types/resource'
import { cn } from '@/utils/cn'

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

type ContactKind = 'phone' | 'email' | 'website' | 'other'

/** Presentation-only: truncate backend time strings like "09:00:00" to 12-hour display. */
function formatTime(value: string | null): string | null {
  if (!value) return null
  const raw = value.length >= 5 ? value.slice(0, 5) : value
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw)
  if (!match) return raw
  const hour = Number(match[1])
  const minute = match[2]
  if (Number.isNaN(hour) || hour > 23) return raw
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minute} ${period}`
}

function formatHourRange(hour: ResourceHourDto): string {
  if (hour.is_closed) return 'Closed'
  if (hour.by_appointment_only) return 'By appointment'
  const opens = formatTime(hour.opens_at)
  const closes = formatTime(hour.closes_at)
  if (opens && closes) return `${opens} – ${closes}`
  if (opens) return `Opens ${opens}`
  if (closes) return `Closes ${closes}`
  return 'Hours unavailable'
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

function classifyContact(contact: ResourceContactDto): ContactKind {
  const type = contact.contact_type.toLowerCase()
  const value = contact.contact_value.trim()
  if (type.includes('email') || value.includes('@')) return 'email'
  if (type.includes('phone') || type.includes('tel')) return 'phone'
  if (type.includes('web') || type.includes('url') || /^https?:\/\//i.test(value)) {
    return 'website'
  }
  return 'other'
}

function contactHref(contact: ResourceContactDto): string | null {
  const kind = classifyContact(contact)
  const value = contact.contact_value.trim()
  if (!value) return null
  if (kind === 'email') return `mailto:${value}`
  if (kind === 'phone') return `tel:${value.replace(/[^\d+]/g, '')}`
  if (kind === 'website') {
    return value.startsWith('http') ? value : `https://${value}`
  }
  return null
}

function directionsHref(location: ResourceLocationDto): string | null {
  if (location.lat != null && location.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`
  }
  const address = formatLocationAddress(location)
  if (!address) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

function hasText(value: string | null | undefined): value is string {
  return Boolean(value && value.trim())
}

/** First concise clause for glance summaries — not a full paragraph. */
function conciseFact(value: string, maxLength = 42): string {
  const normalized = value.trim().replace(/\s+/g, ' ')
  const clause = normalized.split(/(?<=[.!;])\s+|,\s+|;\s+|\n+/)[0]?.trim() || normalized
  if (clause.length <= maxLength) return clause.replace(/[.!;]+$/, '')
  return `${clause.slice(0, maxLength).trimEnd()}…`
}

function pickPrimaryContact(
  contacts: ResourceContactDto[],
  kind: ContactKind,
): ResourceContactDto | undefined {
  const matches = contacts.filter((c) => classifyContact(c) === kind)
  return matches.find((c) => c.is_primary) ?? matches[0]
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
      <div className="workspace-content flex-1 !gap-3">
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
          <DiscoverResourceOrEventPresentation
            resourceId={resource.resource_id}
            version={resource.version}
          />
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

/**
 * Public Discover detail: events use EventDetailPresentation so recurrence
 * and schedule match moderator review; everything else uses ResourceDetailPresentation.
 */
function DiscoverResourceOrEventPresentation({
  resourceId,
  version,
}: {
  resourceId: number
  version: ResourceVersionDto
}) {
  const eventPresentation = useMemo(() => {
    // Schedule notes only — do not treat resource_type "Program" as an event.
    // Sample/seeded Programs (e.g. community centres) must use resource detail + update CTA.
    if (!hasEventScheduleNotes(version)) return null
    return mapEventVersionForPresentation(version)
  }, [version])

  if (eventPresentation) {
    return (
      <EventDetailPresentation
        presentation={eventPresentation}
        audience="public"
      />
    )
  }

  return (
    <ResourceDetailPresentation resourceId={resourceId} version={version} />
  )
}

/**
 * Resident-facing resource detail presentation.
 *
 * Always runs {@link mapResourceVersionForPresentation} so Discover and staff
 * review share one mapping path (seeded and newly approved resources alike).
 */
export function ResourceDetailPresentation({
  resourceId,
  version: rawVersion,
}: {
  /** When set, shows the shared Update Resource entry point (Discover only). */
  resourceId?: number
  version: ResourceVersionDto
}) {
  const presentation = useMemo(
    () => mapResourceVersionForPresentation(rawVersion),
    [rawVersion],
  )
  const version = presentation.version
  const hoursSummary = presentation.hoursSummary
  const accessModeLabel = presentation.accessModeLabel
  const isOnlineOnly = presentation.isOnlineOnly
  const onlineAccessUrl = presentation.onlineAccessUrl

  const categories = version.categories.filter((c) => hasText(c.name))
  const tags = version.tags.filter((t) => hasText(t.name))
  const locations = version.locations
  const contacts = version.contacts.filter((c) => hasText(c.contact_value))
  const hours = [...version.hours].sort((a, b) => a.day_of_week - b.day_of_week)

  const primaryLocation =
    locations.find((location) => location.is_primary) ?? locations[0] ?? null
  const phoneContact = pickPrimaryContact(contacts, 'phone')
  const emailContact = pickPrimaryContact(contacts, 'email')
  const websiteContact = pickPrimaryContact(contacts, 'website')
  const directionsUrl = primaryLocation ? directionsHref(primaryLocation) : null
  const locationOnlineUrl = resolveOnlineLocationUrl(
    onlineAccessUrl,
    isOnlineOnly ? websiteContact?.contact_value : null,
  )

  /**
   * Backend has no separate organization-name field today.
   * When that field exists and differs from the resource name, render it under the title.
   */
  const organizationName: string | null = null

  const hasServiceDetails =
    hasText(version.eligibility) ||
    hasText(version.cost_description) ||
    hasText(version.accessibility_notes) ||
    hours.length > 0 ||
    hasText(hoursSummary) ||
    tags.length > 0 ||
    contacts.length > 0

  const hasLocation =
    locations.length > 0 ||
    isOnlineOnly ||
    Boolean(accessModeLabel) ||
    Boolean(locationOnlineUrl)

  return (
    <div className="flex flex-col gap-3">
      {/* Hero */}
      <ResourceHero imageUrl={version.image_url} alt={`${version.name} photo`} />

      {/* Identity + primary actions */}
      <WorkspaceSection aria-label="General information" divider className="pb-3">
        <div className="space-y-2.5">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-semibold leading-tight text-foreground">
              {version.name}
            </h2>
            {/* Organization name: render when a dedicated org field exists and differs from version.name */}
            {organizationName && (
              <p className="text-xs text-muted-foreground">{organizationName}</p>
            )}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {hasText(version.resource_type) && (
                <Badge variant="primary">{version.resource_type}</Badge>
              )}
              {categories.map((category) => (
                <Badge
                  key={category.category_id}
                  variant={category.is_primary ? 'default' : 'outline'}
                >
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>

          <PrimaryActions
            phone={phoneContact}
            website={websiteContact}
            email={emailContact}
            directionsUrl={directionsUrl}
          />
        </div>
      </WorkspaceSection>

      {/* About card — description + narrative notes only (not hours/cost/location). */}
      {(hasText(version.description) || hasText(version.general_notes)) && (
        <AboutSection
          description={version.description}
          notes={version.general_notes}
        />
      )}

      {/* Location — physical venues and/or online access from presentation mapping. */}
      {hasLocation && (
        <DetailSectionCard
          icon={<MapPin className="h-4 w-4" strokeWidth={2} />}
          title={locations.length > 1 ? 'Locations' : 'Location'}
        >
          {locations.length > 0 ? (
            <ul className="space-y-2.5 p-0 list-none">
              {locations.map((location) => (
                <LocationRow key={location.location_id} location={location} />
              ))}
              {accessModeLabel && !isOnlineOnly ? (
                <li className="space-y-1 text-sm text-muted-foreground">
                  <p>{accessModeLabel}</p>
                  {locationOnlineUrl ? (
                    <OnlineAccessLink url={locationOnlineUrl} />
                  ) : null}
                </li>
              ) : locationOnlineUrl && !isOnlineOnly ? (
                <li className="text-sm">
                  <OnlineAccessLink url={locationOnlineUrl} />
                </li>
              ) : null}
            </ul>
          ) : (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {isOnlineOnly ? 'Online' : accessModeLabel || 'Location'}
              </p>
              {locationOnlineUrl ? (
                <OnlineAccessLink url={locationOnlineUrl} />
              ) : null}
            </div>
          )}
        </DetailSectionCard>
      )}

      {/* Service Details — collapsed by default */}
      {hasServiceDetails && (
        <ServiceDetailsSection
          eligibility={version.eligibility}
          cost={version.cost_description}
          accessibility={version.accessibility_notes}
          hours={hours}
          hoursSummary={hoursSummary}
          contacts={contacts}
          tags={tags}
        />
      )}

      {typeof resourceId === 'number' ? (
        <RequestResourceUpdateFlow
          resourceName={hasText(version.name) ? version.name : undefined}
        />
      ) : null}

      {/* Disclaimer */}
      <WorkspaceSection aria-label="Disclaimer">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Information may change over time. Please contact the organization
          directly to confirm hours, availability, and eligibility before visiting.
        </p>
      </WorkspaceSection>

      {/*
        Future extension point: Staff Status / moderation section.
        Insert staff-only verification UI here (moderation status, approval dates,
        submitted dates, image metadata) without restructuring public sections above.
      */}
    </div>
  )
}

function ResourceHero({
  imageUrl,
  alt,
}: {
  imageUrl: string | null
  alt: string
}) {
  const [failed, setFailed] = useState(false)
  const src = hasText(imageUrl) && !failed ? imageUrl : resourcePlaceholder
  const usingFallback = src === resourcePlaceholder

  return (
    <div
      className={cn(
        '-mx-[var(--ds-workspace-padding)] -mt-[var(--ds-workspace-padding)]',
        'mb-0 overflow-hidden rounded-b-xl bg-muted',
      )}
    >
      {/* ~25% shorter than the previous 16/10 hero */}
      <div className="aspect-[17/8] w-full">
        <img
          src={src}
          alt={usingFallback ? 'Community resource placeholder' : alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  )
}

function PrimaryActions({
  phone,
  website,
  email,
  directionsUrl,
}: {
  phone?: ResourceContactDto
  website?: ResourceContactDto
  email?: ResourceContactDto
  directionsUrl: string | null
}) {
  const actions: Array<{
    key: string
    href: string
    label: string
    icon: ReactNode
    external?: boolean
  }> = []

  if (phone) {
    const href = contactHref(phone)
    if (href) {
      actions.push({
        key: 'call',
        href,
        label: 'Call',
        icon: <Phone className="h-4 w-4" aria-hidden="true" />,
      })
    }
  }
  if (website) {
    const href = contactHref(website)
    if (href) {
      actions.push({
        key: 'website',
        href,
        label: 'Website',
        icon: <Globe className="h-4 w-4" aria-hidden="true" />,
        external: true,
      })
    }
  }
  if (email) {
    const href = contactHref(email)
    if (href) {
      actions.push({
        key: 'email',
        href,
        label: 'Email',
        icon: <Mail className="h-4 w-4" aria-hidden="true" />,
      })
    }
  }
  if (directionsUrl) {
    actions.push({
      key: 'directions',
      href: directionsUrl,
      label: 'Directions',
      icon: <Navigation className="h-4 w-4" aria-hidden="true" />,
      external: true,
    })
  }

  if (actions.length === 0) return null

  return (
    <div
      className="flex items-stretch overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
      role="group"
      aria-label="Primary actions"
    >
      {actions.map((action, index) => (
        <a
          key={action.key}
          href={action.href}
          className={cn(
            'flex min-h-[var(--ds-min-touch)] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2',
            'text-[11px] font-medium text-foreground transition-colors focus-ring',
            'hover:bg-interactive-muted hover:text-interactive',
            index > 0 && 'border-l border-border',
          )}
          {...(action.external ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
          <span className="text-interactive">{action.icon}</span>
          <span>{action.label}</span>
        </a>
      ))}
    </div>
  )
}

function LocationRow({ location }: { location: ResourceLocationDto }) {
  const address = formatLocationAddress(location)

  return (
    <li className="min-w-0 space-y-0.5 text-sm">
      {hasText(location.location_name) && (
        <p className="font-medium leading-snug text-foreground">{location.location_name}</p>
      )}
      {address && (
        <p className="leading-snug text-muted-foreground">{address}</p>
      )}
      {hasText(location.service_area_notes) && (
        <p className="leading-snug text-muted-foreground">{location.service_area_notes}</p>
      )}
    </li>
  )
}

function OnlineAccessLink({ url }: { url: string }) {
  return (
    <a
      href={externalHref(url)}
      target="_blank"
      rel="noreferrer"
      className="break-all text-interactive underline-offset-2 hover:underline focus-ring rounded-sm"
    >
      {url}
    </a>
  )
}

function AboutSection({
  description,
  notes,
}: {
  description: string | null
  notes: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [isClampable, setIsClampable] = useState(false)

  useLayoutEffect(() => {
    const node = textRef.current
    if (!node || !hasText(description)) {
      setIsClampable(false)
      return
    }
    if (expanded) return
    setIsClampable(node.scrollHeight > node.clientHeight + 1)
  }, [description, expanded])

  return (
    <DetailSectionCard
      icon={<Info className="h-4 w-4" strokeWidth={2} />}
      title="About"
    >
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {hasText(description) && (
          <div>
            <p
              ref={textRef}
              className={cn('whitespace-pre-wrap', !expanded && 'line-clamp-4')}
            >
              {description}
            </p>
            {(isClampable || expanded) && (
              <button
                type="button"
                className="mt-1 inline-flex min-h-[var(--ds-min-touch)] items-center text-xs font-medium text-interactive hover:underline focus-ring rounded-md sm:min-h-0"
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
        {hasText(notes) && <p className="whitespace-pre-wrap">{notes}</p>}
      </div>
    </DetailSectionCard>
  )
}

function ServiceDetailsSection({
  eligibility,
  cost,
  accessibility,
  hours,
  hoursSummary = null,
  contacts,
  tags,
}: {
  eligibility: string | null
  cost: string | null
  accessibility: string | null
  hours: ResourceHourDto[]
  hoursSummary?: string | null
  contacts: ResourceContactDto[]
  tags: ResourceVersionTagDto[]
}) {
  const panelId = useId()
  const [expanded, setExpanded] = useState(false)

  const todayIndex = new Date().getDay()
  const today = hours.find((hour) => hour.day_of_week === todayIndex)
  const todayRange = today ? formatHourRange(today) : null
  const todayStatus = today
    ? today.is_closed
      ? 'Closed today'
      : !today.is_closed && (Boolean(today.opens_at) || today.by_appointment_only)
        ? 'Open today'
        : 'Today'
    : null

  const costSummary = hasText(cost) ? conciseFact(cost, 36) : null
  const accessibilitySummary = hasText(accessibility)
    ? conciseFact(accessibility)
    : null
  const hoursSummaryLine = hasText(hoursSummary)
    ? conciseFact(hoursSummary, 42)
    : null

  const informationalContacts = contacts.filter((contact) => {
    const kind = classifyContact(contact)
    return kind === 'phone' || kind === 'email' || kind === 'website'
  })
  const visibleTags = tags.filter((tag) => hasText(tag.name))

  const hasCollapsedPreview =
    Boolean(costSummary) ||
    hours.length > 0 ||
    Boolean(hoursSummaryLine) ||
    Boolean(accessibilitySummary)
  const hasExpandedExtras =
    hasText(eligibility) ||
    informationalContacts.length > 0 ||
    visibleTags.length > 0 ||
    hours.length > 0 ||
    hasText(hoursSummary) ||
    hasText(cost) ||
    hasText(accessibility)

  return (
    <DetailSectionCard
      icon={<Settings className="h-4 w-4" strokeWidth={2} />}
      title="Service Details"
    >
      <div className="space-y-3">
        <div id={panelId} className="divide-y divide-border">
          {expanded ? (
            <>
              {hasText(eligibility) && (
                <DetailGlanceRow
                  label="Eligibility"
                  icon={<Users className="h-3.5 w-3.5" strokeWidth={2} />}
                >
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {eligibility}
                  </p>
                </DetailGlanceRow>
              )}

              {hasText(cost) && (
                <DetailGlanceRow
                  label="Cost"
                  icon={<Banknote className="h-3.5 w-3.5" strokeWidth={2} />}
                >
                  <p className="whitespace-pre-wrap text-muted-foreground">{cost}</p>
                </DetailGlanceRow>
              )}

              {hasText(accessibility) && (
                <DetailGlanceRow
                  label="Accessibility"
                  icon={<Accessibility className="h-3.5 w-3.5" strokeWidth={2} />}
                >
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {accessibility}
                  </p>
                </DetailGlanceRow>
              )}

              {hours.length > 0 ? (
                <DetailGlanceRow
                  label="Hours"
                  icon={<Clock className="h-3.5 w-3.5" strokeWidth={2} />}
                >
                  <ul className="space-y-1 list-none p-0">
                    {hours.map((hour) => (
                      <li
                        key={hour.day_of_week}
                        className="flex items-start justify-between gap-2 text-xs text-muted-foreground"
                      >
                        <span className="font-medium text-foreground">
                          {DAY_LABELS[hour.day_of_week] ?? `Day ${hour.day_of_week}`}
                        </span>
                        <span className="text-right">
                          {formatHourRange(hour)}
                          {hasText(hour.notes) ? ` — ${hour.notes}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </DetailGlanceRow>
              ) : hasText(hoursSummary) ? (
                <DetailGlanceRow
                  label="Hours"
                  icon={<Clock className="h-3.5 w-3.5" strokeWidth={2} />}
                >
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {hoursSummary}
                  </p>
                </DetailGlanceRow>
              ) : null}
            </>
          ) : (
            <>
              {costSummary && (
                <DetailGlanceRow
                  label="Cost"
                  icon={<Banknote className="h-3.5 w-3.5" strokeWidth={2} />}
                >
                  <p>{costSummary}</p>
                </DetailGlanceRow>
              )}

              {accessibilitySummary && (
                <DetailGlanceRow
                  label="Accessibility"
                  icon={<Accessibility className="h-3.5 w-3.5" strokeWidth={2} />}
                >
                  <p>{accessibilitySummary}</p>
                </DetailGlanceRow>
              )}

              {hours.length > 0 ? (
                <DetailGlanceRow
                  label="Hours"
                  icon={<Clock className="h-3.5 w-3.5" strokeWidth={2} />}
                >
                  <div>
                    <p className="font-medium">{todayStatus ?? 'Hours'}</p>
                    {todayRange && (
                      <p className="text-muted-foreground">{todayRange}</p>
                    )}
                    {!today && hours[0] && (
                      <p className="text-muted-foreground">
                        {formatHourRange(hours[0])}
                      </p>
                    )}
                  </div>
                </DetailGlanceRow>
              ) : hoursSummaryLine ? (
                <DetailGlanceRow
                  label="Hours"
                  icon={<Clock className="h-3.5 w-3.5" strokeWidth={2} />}
                >
                  <p>{hoursSummaryLine}</p>
                </DetailGlanceRow>
              ) : null}
            </>
          )}
        </div>

        {expanded && informationalContacts.length > 0 && (
          <div
            className={cn(
              (hasText(eligibility) ||
                hasText(cost) ||
                hasText(accessibility) ||
                hours.length > 0 ||
                hasText(hoursSummary)) &&
                'border-t border-border pt-2.5',
            )}
          >
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Contact
            </p>
            <ul className="space-y-2.5 p-0 list-none">
              {informationalContacts.map((contact) => (
                <CompactContactRow key={contact.contact_id} contact={contact} />
              ))}
            </ul>
          </div>
        )}

        {expanded && visibleTags.length > 0 && (
          <div
            className={cn(
              (hasText(eligibility) ||
                hasText(cost) ||
                hasText(accessibility) ||
                hours.length > 0 ||
                hasText(hoursSummary) ||
                informationalContacts.length > 0) &&
                'border-t border-border pt-2.5',
            )}
          >
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <Badge key={tag.tag_id} variant="outline">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {hasExpandedExtras && (
          <div
            className={cn(
              (hasCollapsedPreview || expanded) && 'border-t border-border pt-2',
            )}
          >
            <button
              type="button"
              className="inline-flex min-h-[var(--ds-min-touch)] items-center gap-1 text-xs font-medium text-interactive hover:underline focus-ring rounded-md sm:min-h-0"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Hide service details' : 'View complete service details'}
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  expanded && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </button>
          </div>
        )}
      </div>
    </DetailSectionCard>
  )
}

function CompactContactRow({ contact }: { contact: ResourceContactDto }) {
  const kind = classifyContact(contact)
  const Icon = kind === 'email' ? Mail : kind === 'website' ? Globe : Phone
  const kindLabel =
    kind === 'email' ? 'Email' : kind === 'website' ? 'Website' : 'Phone'
  const label = hasText(contact.contact_label) ? contact.contact_label : kindLabel

  return (
    <li className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 inline-flex shrink-0 text-interactive" aria-hidden="true">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="break-all leading-snug text-foreground">{contact.contact_value}</p>
      </div>
    </li>
  )
}
