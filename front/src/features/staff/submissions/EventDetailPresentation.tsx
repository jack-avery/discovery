import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  Accessibility,
  Banknote,
  CalendarDays,
  Clock,
  Globe,
  Info,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Settings,
  Tag,
  Users,
} from 'lucide-react'
import resourcePlaceholder from '@/assets/resource-placeholder.svg'
import { Badge } from '@/components/ui'
import {
  DetailGlanceRow,
  DetailSectionCard,
} from '@/features/discover/DetailInfoCard'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'
import {
  externalHref,
  resolveOnlineLocationUrl,
} from '@/features/discover/locationPresentation'
import type { EventVersionPresentation } from '@/features/staff/submissions/mapEventVersionForPresentation'
import type {
  ResourceContactDto,
  ResourceLocationDto,
} from '@/types/resource'
import { cn } from '@/utils/cn'

type ContactKind = 'phone' | 'email' | 'website' | 'other'

/**
 * Event-specific staff (and future public) detail presentation.
 * Reuses Discover card chrome; uses an event presentation model for schedule fields.
 *
 * @param audience - `moderator` always shows Registration (including Not sure).
 *   `public` hides Registration when the value is Not sure.
 */
export function EventDetailPresentation({
  presentation,
  audience = 'moderator',
}: {
  presentation: EventVersionPresentation
  audience?: 'moderator' | 'public'
}) {
  const { version, eventDetails, isOnlineOnly, accessModeLabel, onlineAccessUrl } =
    presentation
  const visibleEventDetails =
    audience === 'public'
      ? eventDetails.filter((field) => field.includeInPublic !== false)
      : eventDetails
  const categories = version.categories.filter((c) => hasText(c.name))
  const tags = version.tags.filter((t) => hasText(t.name))
  const locations = version.locations
  const contacts = version.contacts.filter((c) => hasText(c.contact_value))

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

  const hasServiceDetails =
    hasText(version.eligibility) ||
    hasText(version.cost_description) ||
    hasText(version.accessibility_notes)

  const hasLocation =
    locations.length > 0 ||
    isOnlineOnly ||
    Boolean(accessModeLabel) ||
    Boolean(locationOnlineUrl)

  return (
    <div className="flex flex-col gap-3">
      <DetailHero imageUrl={version.image_url} alt={`${version.name} photo`} />

      <WorkspaceSection aria-label="General information" divider className="pb-3">
        <div className="space-y-2.5">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-semibold leading-tight text-foreground">
              {version.name}
            </h2>
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <Badge variant="primary">Event</Badge>
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

      {(hasText(version.description) || hasText(version.general_notes)) && (
        <AboutSection
          description={version.description}
          notes={version.general_notes}
        />
      )}

      {visibleEventDetails.length > 0 && (
        <DetailSectionCard
          icon={<CalendarDays className="h-4 w-4" strokeWidth={2} />}
          title="Event Details"
        >
          <div className="divide-y divide-border">
            {visibleEventDetails.map((field) => (
              <DetailGlanceRow
                key={`${field.label}:${field.value}`}
                label={field.label}
                icon={eventFieldIcon(field.label)}
              >
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {field.value}
                </p>
              </DetailGlanceRow>
            ))}
          </div>
        </DetailSectionCard>
      )}

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

      {hasServiceDetails && (
        <DetailSectionCard
          icon={<Settings className="h-4 w-4" strokeWidth={2} />}
          title="Service Details"
        >
          <div className="divide-y divide-border">
            {hasText(version.eligibility) && (
              <DetailGlanceRow
                label="Eligibility"
                icon={<Users className="h-3.5 w-3.5" strokeWidth={2} />}
              >
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {version.eligibility}
                </p>
              </DetailGlanceRow>
            )}
            {hasText(version.cost_description) && (
              <DetailGlanceRow
                label="Cost"
                icon={<Banknote className="h-3.5 w-3.5" strokeWidth={2} />}
              >
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {version.cost_description}
                </p>
              </DetailGlanceRow>
            )}
            {hasText(version.accessibility_notes) && (
              <DetailGlanceRow
                label="Accessibility"
                icon={<Accessibility className="h-3.5 w-3.5" strokeWidth={2} />}
              >
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {version.accessibility_notes}
                </p>
              </DetailGlanceRow>
            )}
          </div>
        </DetailSectionCard>
      )}

      {contacts.length > 0 && (
        <DetailSectionCard
          icon={<Phone className="h-4 w-4" strokeWidth={2} />}
          title="Contact"
        >
          <ul className="space-y-2.5 p-0 list-none">
            {contacts.map((contact) => (
              <CompactContactRow key={contact.contact_id} contact={contact} />
            ))}
          </ul>
        </DetailSectionCard>
      )}

      {tags.length > 0 && (
        <DetailSectionCard
          icon={<Tag className="h-4 w-4" strokeWidth={2} />}
          title="Tags"
        >
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag.tag_id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>
        </DetailSectionCard>
      )}

      <WorkspaceSection aria-label="Disclaimer">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Event details may change. Please confirm date, time, registration, and
          location with the organizer before attending.
        </p>
      </WorkspaceSection>
    </div>
  )
}

function eventFieldIcon(label: string): ReactNode {
  switch (label) {
    case 'Date':
    case 'End date':
    case 'Event type':
    case 'Frequency':
    case 'Repeats':
    case 'Until':
    case 'Recurrence end':
      return <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
    case 'Time':
      return <Clock className="h-3.5 w-3.5" strokeWidth={2} />
    case 'Registration':
      return <Users className="h-3.5 w-3.5" strokeWidth={2} />
    default:
      return <Info className="h-3.5 w-3.5" strokeWidth={2} />
  }
}

function DetailHero({
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
      <div className="aspect-[17/8] w-full">
        <img
          src={src}
          alt={usingFallback ? 'Community event placeholder' : alt}
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
        <p className="font-medium leading-snug text-foreground">
          {location.location_name}
        </p>
      )}
      {address && <p className="leading-snug text-muted-foreground">{address}</p>}
      {hasText(location.service_area_notes) && (
        <p className="leading-snug text-muted-foreground">
          {location.service_area_notes}
        </p>
      )}
      {location.is_virtual && (
        <p className="leading-snug text-muted-foreground">Virtual</p>
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

function hasText(value: string | null | undefined): value is string {
  return Boolean(value && value.trim())
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

function pickPrimaryContact(
  contacts: ResourceContactDto[],
  kind: ContactKind,
): ResourceContactDto | undefined {
  const matches = contacts.filter((c) => classifyContact(c) === kind)
  return matches.find((c) => c.is_primary) ?? matches[0]
}
