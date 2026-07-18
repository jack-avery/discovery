import type {
  ExistingResourceLocation,
  ResourceContactMethod,
} from '@/types/submission'
import type {
  PublicSubmissionContactDto,
  PublicSubmissionLocationDto,
} from '@/types/submissionApi'
import { normalizePhoneE164 } from '@/utils/phone'
import { formatNoteSections, line, trimText, type NoteSection } from './notes'

const CONTACT_TYPE_MAP: Record<ResourceContactMethod['type'], string> = {
  phone: 'phone',
  email: 'email',
  website: 'website',
  other: 'other',
}

export function mapPublicContacts(
  contacts: ResourceContactMethod[],
): PublicSubmissionContactDto[] {
  const mapped: PublicSubmissionContactDto[] = []

  for (const contact of contacts) {
    const raw = trimText(contact.value)
    if (!raw) continue

    const value =
      contact.type === 'phone' ? (normalizePhoneE164(raw) ?? raw) : raw

    mapped.push({
      contact_type: CONTACT_TYPE_MAP[contact.type] ?? 'other',
      value,
      ...(trimText(contact.label) ? { label: trimText(contact.label) } : {}),
    })
  }

  return mapped
}

/**
 * Add a Website contact for an online URL when not already present.
 */
export function ensureWebsiteContact(
  contacts: PublicSubmissionContactDto[],
  url: string,
): PublicSubmissionContactDto[] {
  const trimmed = trimText(url)
  if (!trimmed) return contacts

  const alreadyPresent = contacts.some(
    (c) =>
      c.contact_type === 'website' &&
      c.value.toLowerCase() === trimmed.toLowerCase(),
  )
  if (alreadyPresent) return contacts

  return [
    ...contacts,
    {
      contact_type: 'website',
      value: trimmed,
      label: 'Online access',
    },
  ]
}

export function mapPublicLocations(
  locations: ExistingResourceLocation[],
): PublicSubmissionLocationDto[] {
  const mapped: PublicSubmissionLocationDto[] = []

  for (const location of locations) {
    const address = trimText(location.streetAddress)
    if (!address) continue

    const city = trimText(location.city)
    const province = trimText(location.province)
    const postal = trimText(location.postalCode)
    const hasCoords =
      typeof location.lat === 'number' &&
      Number.isFinite(location.lat) &&
      typeof location.lng === 'number' &&
      Number.isFinite(location.lng)

    mapped.push({
      address,
      ...(city ? { city } : {}),
      ...(province ? { province } : {}),
      ...(postal ? { postal_code: postal } : {}),
      ...(hasCoords ? { lat: location.lat!, lng: location.lng! } : {}),
    })
  }

  return mapped
}

/**
 * Location name / unit are not accepted by the public API — preserve in notes.
 */
export function buildLocationDetailNotes(
  locations: ExistingResourceLocation[],
): NoteSection | null {
  const blocks: string[] = []

  locations.forEach((location, index) => {
    const name = trimText(location.locationName)
    const unit = trimText(location.unit)
    if (!name && !unit) return

    const lines = [
      `Location ${index + 1}`,
      line('Name', name),
      line('Unit / Suite', unit),
    ].filter(Boolean) as string[]

    blocks.push(lines.join('\n'))
  })

  if (blocks.length === 0) return null

  return {
    heading: 'Additional location details:',
    lines: blocks,
  }
}

export function joinNoteSections(
  sections: Array<NoteSection | null | undefined>,
): string | undefined {
  return formatNoteSections(
    sections.filter((s): s is NoteSection => Boolean(s)),
  )
}
