import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  Clock,
  Globe,
  HeartHandshake,
  Info,
  Languages,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Users,
} from 'lucide-react'
import resourcePlaceholder from '@/assets/resource-placeholder.svg'
import { Badge } from '@/components/ui'
import {
  DetailGlanceRow,
  DetailSectionCard,
} from '@/features/discover/DetailInfoCard'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'
import type { SkillVersionPresentation } from '@/features/staff/submissions/mapSkillVersionForPresentation'
import type { ResourceLocationDto } from '@/types/resource'
import { cn } from '@/utils/cn'

/**
 * Skill / service contribution presentation for staff review.
 * Reuses Discover card chrome with a skill-specific section model.
 */
export function SkillDetailPresentation({
  presentation,
}: {
  presentation: SkillVersionPresentation
}) {
  const {
    title,
    imageUrl,
    about,
    skillsOffered,
    availability,
    availabilityNotes,
    languages,
    whoCanBenefit,
    locations,
    serviceAreaSummary,
    contact,
  } = presentation

  const hasAbout =
    hasText(about.contributor) ||
    hasText(about.motivation) ||
    hasText(about.description)

  const hasAvailability =
    availability.length > 0 || hasText(availabilityNotes)

  const hasContact =
    hasText(contact.preferredMethod) ||
    hasText(contact.phone) ||
    hasText(contact.email) ||
    hasText(contact.website) ||
    hasText(contact.name)

  const hasServiceArea =
    locations.length > 0 || hasText(serviceAreaSummary)

  const phoneHref = hasText(contact.phone)
    ? `tel:${contact.phone.replace(/[^\d+]/g, '')}`
    : null
  const emailHref = hasText(contact.email) ? `mailto:${contact.email}` : null
  const websiteHref = hasText(contact.website)
    ? contact.website.startsWith('http')
      ? contact.website
      : `https://${contact.website}`
    : null

  return (
    <div className="flex flex-col gap-3">
      <DetailHero imageUrl={imageUrl} alt={`${title} photo`} />

      <WorkspaceSection aria-label="General information" divider className="pb-3">
        <div className="space-y-2.5">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-semibold leading-tight text-foreground">
              {title}
            </h2>
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <Badge variant="primary">Skills &amp; Services</Badge>
            </div>
          </div>

          <PrimaryActions
            phoneHref={phoneHref}
            emailHref={emailHref}
            websiteHref={websiteHref}
          />
        </div>
      </WorkspaceSection>

      {hasAbout && (
        <DetailSectionCard
          icon={<Info className="h-4 w-4" strokeWidth={2} />}
          title="About"
        >
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {hasText(about.contributor) && (
              <NarrativeBlock label="About the contributor" text={about.contributor} />
            )}
            {hasText(about.motivation) && (
              <NarrativeBlock label="Motivation" text={about.motivation} />
            )}
            {hasText(about.description) && (
              <AboutNarrative text={about.description} />
            )}
          </div>
        </DetailSectionCard>
      )}

      {skillsOffered.length > 0 && (
        <DetailSectionCard
          icon={<Sparkles className="h-4 w-4" strokeWidth={2} />}
          title="Skills / Services Offered"
        >
          <PlainValueList items={skillsOffered} />
        </DetailSectionCard>
      )}

      {hasAvailability && (
        <DetailSectionCard
          icon={<Clock className="h-4 w-4" strokeWidth={2} />}
          title="Availability"
        >
          <div className="space-y-2.5">
            {availability.length > 0 && <PlainValueList items={availability} />}
            {hasText(availabilityNotes) && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {availabilityNotes}
              </p>
            )}
          </div>
        </DetailSectionCard>
      )}

      {languages.length > 0 && (
        <DetailSectionCard
          icon={<Languages className="h-4 w-4" strokeWidth={2} />}
          title="Languages"
        >
          <ChipList items={languages} />
        </DetailSectionCard>
      )}

      {hasText(whoCanBenefit) && (
        <DetailSectionCard
          icon={<Users className="h-4 w-4" strokeWidth={2} />}
          title="Who Can Benefit"
        >
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {whoCanBenefit}
          </p>
        </DetailSectionCard>
      )}

      {hasServiceArea && (
        <DetailSectionCard
          icon={<MapPin className="h-4 w-4" strokeWidth={2} />}
          title={locations.length > 1 ? 'Service Area / Locations' : 'Service Area / Location'}
        >
          {locations.length > 0 ? (
            <ul className="space-y-2.5 p-0 list-none">
              {locations.map((location) => (
                <LocationRow key={location.location_id} location={location} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{serviceAreaSummary}</p>
          )}
        </DetailSectionCard>
      )}

      {hasContact && (
        <DetailSectionCard
          icon={<Phone className="h-4 w-4" strokeWidth={2} />}
          title="Contact"
        >
          <div className="divide-y divide-border">
            {hasText(contact.preferredMethod) && (
              <DetailGlanceRow
                label="Preferred contact method"
                icon={<HeartHandshake className="h-3.5 w-3.5" strokeWidth={2} />}
              >
                <p>{contact.preferredMethod}</p>
              </DetailGlanceRow>
            )}
            {hasText(contact.name) && (
              <DetailGlanceRow
                label="Name"
                icon={<Users className="h-3.5 w-3.5" strokeWidth={2} />}
              >
                <p>{contact.name}</p>
              </DetailGlanceRow>
            )}
            {hasText(contact.phone) && (
              <DetailGlanceRow
                label="Phone"
                icon={<Phone className="h-3.5 w-3.5" strokeWidth={2} />}
              >
                <p className="break-all">{contact.phone}</p>
              </DetailGlanceRow>
            )}
            {hasText(contact.email) && (
              <DetailGlanceRow
                label="Email"
                icon={<Mail className="h-3.5 w-3.5" strokeWidth={2} />}
              >
                <p className="break-all">{contact.email}</p>
              </DetailGlanceRow>
            )}
            {hasText(contact.website) && (
              <DetailGlanceRow
                label="Website"
                icon={<Globe className="h-3.5 w-3.5" strokeWidth={2} />}
              >
                <p className="break-all">{contact.website}</p>
              </DetailGlanceRow>
            )}
          </div>
        </DetailSectionCard>
      )}

      <WorkspaceSection aria-label="Disclaimer">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Offers from community members may change. Please confirm availability
          and details directly with the contributor.
        </p>
      </WorkspaceSection>
    </div>
  )
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="outline">
          {item}
        </Badge>
      ))}
    </div>
  )
}

/** Informational values — plain text / list, not taxonomy chips. */
function PlainValueList({ items }: { items: string[] }) {
  if (items.length === 1) {
    return (
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{items[0]}</p>
    )
  }

  return (
    <ul className="list-none space-y-1.5 p-0 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="leading-snug">
          {item}
        </li>
      ))}
    </ul>
  )
}

function NarrativeBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-foreground/90">{text}</p>
    </div>
  )
}

function AboutNarrative({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [isClampable, setIsClampable] = useState(false)

  useLayoutEffect(() => {
    const node = textRef.current
    if (!node) {
      setIsClampable(false)
      return
    }
    if (expanded) return
    setIsClampable(node.scrollHeight > node.clientHeight + 1)
  }, [text, expanded])

  return (
    <div>
      <p
        ref={textRef}
        className={cn('whitespace-pre-wrap', !expanded && 'line-clamp-4')}
      >
        {text}
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
  )
}

function LocationRow({ location }: { location: ResourceLocationDto }) {
  const address = [
    location.address_line1,
    location.address_line2,
    [location.city, location.province].filter(Boolean).join(', '),
    location.postal_code,
    location.country,
  ]
    .filter((part) => Boolean(part && String(part).trim()))
    .join(', ')

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
        <p className="leading-snug text-muted-foreground">Online / virtual</p>
      )}
    </li>
  )
}

function PrimaryActions({
  phoneHref,
  emailHref,
  websiteHref,
}: {
  phoneHref: string | null
  emailHref: string | null
  websiteHref: string | null
}) {
  const actions: Array<{
    key: string
    href: string
    label: string
    icon: ReactNode
    external?: boolean
  }> = []

  if (phoneHref) {
    actions.push({
      key: 'call',
      href: phoneHref,
      label: 'Call',
      icon: <Phone className="h-4 w-4" aria-hidden="true" />,
    })
  }
  if (websiteHref) {
    actions.push({
      key: 'website',
      href: websiteHref,
      label: 'Website',
      icon: <Globe className="h-4 w-4" aria-hidden="true" />,
      external: true,
    })
  }
  if (emailHref) {
    actions.push({
      key: 'email',
      href: emailHref,
      label: 'Email',
      icon: <Mail className="h-4 w-4" aria-hidden="true" />,
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

function hasText(value: string | null | undefined): value is string {
  return Boolean(value && value.trim())
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
          alt={usingFallback ? 'Community skills placeholder' : alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  )
}
