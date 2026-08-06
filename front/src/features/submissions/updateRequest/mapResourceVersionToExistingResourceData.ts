import type {
  AccessMode,
  CostOption,
  DayHours,
  ExistingResourceData,
  HoursAvailability,
  ResourceContactMethod,
  ResourceContactType,
} from '@/types/submission'
import type {
  ResourceContactDto,
  ResourceHourDto,
  ResourceLocationDto,
  ResourceVersionDto,
} from '@/types/resource'
import { mapResourceVersionForPresentation } from '@/features/discover/mapResourceVersionForPresentation'
import {
  labelledLineValue,
  normalizeNoteHeading,
  parseNoteSections,
} from '@/features/staff/submissions/noteSectionUtils'
import { trimText } from '@/features/submissions/mappers/notes'
import { COST_LABELS, HOURS_AVAILABILITY_LABELS } from '@/features/submissions/mappers/labels'
import {
  createContactMethod,
  createDefaultHours,
  createEmptyExistingResourceData,
  createEmptyLocation,
  DEFAULT_CITY,
  DEFAULT_PROVINCE,
  normalizeExistingResourceData,
} from '@/features/submissions/existingResource/emptyState'

/**
 * Prefill the public Existing Resource form from a published resource version.
 * Best-effort: some backend fields only exist as free text / notes.
 */
export function mapResourceVersionToExistingResourceData(
  version: ResourceVersionDto,
): ExistingResourceData {
  const presentation = mapResourceVersionForPresentation(version)
  const presented = presentation.version
  const noteSections = parseNoteSections(version.general_notes)

  const accessMode = resolveAccessMode(
    presentation.isOnlineOnly,
    presentation.accessModeLabel,
    presented.locations,
    noteSections.map((section) =>
      labelledLineValue(
        section.lines.find((line) => /^access type:/i.test(line) || /^access:/i.test(line)) ??
          '',
        'Access type',
      ),
    ),
  )

  const onlineUrl =
    presentation.onlineAccessUrl?.trim() ||
    pickWebsiteContact(presented.contacts, 'online') ||
    ''

  const moreInfoUrl =
    extractMoreInfoUrl(noteSections) ||
    pickWebsiteContact(presented.contacts, 'more') ||
    ''

  const { costOption, costDetails } = parseCostDescription(
    presented.cost_description,
  )

  const { hoursAvailability, hours } = mapHours(
    presented.hours,
    presentation.hoursSummary,
    noteSections,
  )

  const contacts = mapContacts(presented.contacts, onlineUrl, moreInfoUrl)
  const locations = mapLocations(presented.locations)
  const generalNotes = extractAdditionalDetailsNotes(noteSections)

  const data: ExistingResourceData = {
    ...createEmptyExistingResourceData(),
    name: trimText(presented.name) || '',
    description: trimText(presented.description) || '',
    categoryIds: presented.categories.map((category) => category.category_id),
    filterIds: presented.tags.map((tag) => tag.tag_id),
    accessMode,
    locations:
      accessMode === 'online'
        ? locations.length > 0
          ? locations
          : [createEmptyLocation()]
        : locations.length > 0
          ? locations
          : [createEmptyLocation()],
    onlineUrl,
    hoursAvailability,
    hours,
    contacts: contacts.length > 0 ? contacts : [createContactMethod()],
    costOption,
    costDetails,
    accessibilityNotes: trimText(presented.accessibility_notes) || '',
    eligibility: trimText(presented.eligibility) || '',
    moreInfoUrl,
    generalNotes,
    relationship: null,
    relationshipOther: '',
  }

  return normalizeExistingResourceData(data)
}

/**
 * Form `generalNotes` is the underlying staff-note text only.
 * Mapper headings such as "Additional details:" are presentation and are
 * re-applied when building `general_notes` / approved_version payloads.
 */
function extractAdditionalDetailsNotes(
  sections: ReturnType<typeof parseNoteSections>,
): string {
  const additional: string[] = []
  const unstructured: string[] = []

  for (const section of sections) {
    const heading = normalizeNoteHeading(section.heading)
    if (
      heading === 'additional details' ||
      heading === 'additional event details'
    ) {
      additional.push(...section.lines)
      continue
    }
    if (!heading) {
      unstructured.push(...section.lines)
    }
  }

  const raw =
    additional.length > 0
      ? additional
      : unstructured.length > 0
        ? unstructured
        : []

  return trimText(unwrapAdditionalDetailsLabel(raw).join('\n'))
}

/** Strip a duplicated "Additional details:" line left in note body text. */
function unwrapAdditionalDetailsLabel(lines: string[]): string[] {
  let next = [...lines]
  while (next.length > 0) {
    const first = trimText(next[0])
    if (
      /^additional details:\s*$/i.test(first) ||
      /^additional event details:\s*$/i.test(first)
    ) {
      next = next.slice(1)
      continue
    }
    const inline = /^additional (?:event )?details:\s*(.+)$/i.exec(first)
    if (inline) {
      next = [inline[1], ...next.slice(1)]
      continue
    }
    break
  }
  return next
}

function resolveAccessMode(
  isOnlineOnly: boolean,
  accessModeLabel: string | null,
  locations: ResourceLocationDto[],
  accessTypeHints: Array<string | null>,
): AccessMode {
  const physicalLocations = locations.filter((location) => !location.is_virtual)
  const hint = accessTypeHints.find(Boolean)?.toLowerCase() ?? ''
  const label = (accessModeLabel ?? '').toLowerCase()

  if (
    hint.includes('physical and online') ||
    hint.includes('both') ||
    label.includes('physical and online') ||
    label.includes('both') ||
    label.includes('hybrid')
  ) {
    return 'both'
  }
  if (
    isOnlineOnly ||
    hint === 'online' ||
    label === 'online' ||
    (physicalLocations.length === 0 && locations.some((l) => l.is_virtual))
  ) {
    return 'online'
  }
  if (physicalLocations.length > 0 && (onlineHint(label) || onlineHint(hint))) {
    return 'both'
  }
  if (physicalLocations.length > 0) return 'physical'
  if (locations.length === 0 && (onlineHint(label) || onlineHint(hint))) {
    return 'online'
  }
  return physicalLocations.length > 0 ? 'physical' : 'physical'
}

function onlineHint(value: string): boolean {
  return value.includes('online')
}

function mapLocations(
  locations: ResourceLocationDto[],
): ExistingResourceData['locations'] {
  const physical = locations.filter((location) => !location.is_virtual)
  const source = physical.length > 0 ? physical : locations
  return source.map((location) =>
    createEmptyLocation({
      id: `loc-${location.location_id}`,
      locationName: trimText(location.location_name) || '',
      streetAddress: trimText(location.address_line1) || '',
      unit: trimText(location.address_line2) || '',
      city: trimText(location.city) || DEFAULT_CITY,
      province: trimText(location.province) || DEFAULT_PROVINCE,
      postalCode: trimText(location.postal_code) || '',
      lat: location.lat,
      lng: location.lng,
    }),
  )
}

function mapContacts(
  contacts: ResourceContactDto[],
  onlineUrl: string,
  moreInfoUrl: string,
): ResourceContactMethod[] {
  const skip = new Set(
    [onlineUrl, moreInfoUrl]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )

  return contacts
    .filter((contact) => trimText(contact.contact_value))
    .filter((contact) => {
      const value = contact.contact_value.trim().toLowerCase()
      const type = classifyContactType(contact)
      if (type === 'website' && skip.has(value)) return false
      if (type === 'website' && skip.has(normalizeUrlKey(value))) return false
      return true
    })
    .map((contact) =>
      createContactMethod({
        id: `contact-${contact.contact_id}`,
        type: classifyContactType(contact),
        value: contact.contact_value.trim(),
        label: trimText(contact.contact_label) || '',
      }),
    )
}

function classifyContactType(contact: ResourceContactDto): ResourceContactType {
  const type = contact.contact_type.toLowerCase()
  const value = contact.contact_value.trim()
  if (type.includes('email') || value.includes('@')) return 'email'
  if (type.includes('phone') || type.includes('tel')) return 'phone'
  if (
    type.includes('web') ||
    type.includes('url') ||
    /^https?:\/\//i.test(value)
  ) {
    return 'website'
  }
  return 'other'
}

function pickWebsiteContact(
  contacts: ResourceContactDto[],
  kind: 'online' | 'more',
): string {
  const websites = contacts.filter((contact) => classifyContactType(contact) === 'website')
  if (websites.length === 0) return ''
  if (kind === 'online') {
    const labelled = websites.find((contact) =>
      /online|access/i.test(contact.contact_label ?? ''),
    )
    return (labelled ?? websites[0]).contact_value.trim()
  }
  const labelled = websites.find((contact) =>
    /more|info|information/i.test(contact.contact_label ?? ''),
  )
  return labelled?.contact_value.trim() ?? ''
}

function extractMoreInfoUrl(
  sections: ReturnType<typeof parseNoteSections>,
): string {
  for (const section of sections) {
    if (normalizeNoteHeading(section.heading) !== 'more information') continue
    for (const line of section.lines) {
      const trimmed = trimText(line)
      if (trimmed) return trimmed
    }
  }
  return ''
}

function normalizeUrlKey(value: string): string {
  return value.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase()
}

function parseCostDescription(raw: string | null): {
  costOption: CostOption | null
  costDetails: string
} {
  const text = trimText(raw)
  if (!text) return { costOption: null, costDetails: '' }

  const lower = text.toLowerCase()
  for (const option of Object.keys(COST_LABELS) as CostOption[]) {
    const label = COST_LABELS[option].toLowerCase()
    if (lower === label) return { costOption: option, costDetails: '' }
    if (lower.startsWith(`${label}:`)) {
      return {
        costOption: option,
        costDetails: text.slice(label.length + 1).trim(),
      }
    }
  }

  if (lower === 'free' || lower.startsWith('free')) {
    return { costOption: 'free', costDetails: lower === 'free' ? '' : text }
  }
  return { costOption: 'other', costDetails: text }
}

function mapHours(
  rows: ResourceHourDto[],
  hoursSummary: string | null,
  noteSections: ReturnType<typeof parseNoteSections>,
): { hoursAvailability: HoursAvailability; hours: DayHours[] } {
  const hoursNote = noteSections.find((section) => {
    const key = normalizeNoteHeading(section.heading)
    return key === 'hours' || key === 'hours notes' || key === 'availability'
  })
  const noteText = [
    hoursSummary,
    ...(hoursNote?.lines ?? []),
  ]
    .map((line) => trimText(line))
    .filter(Boolean)
    .join('\n')
    .toLowerCase()

  if (noteText.includes(HOURS_AVAILABILITY_LABELS.varies.toLowerCase()) || noteText.includes('hours vary')) {
    return { hoursAvailability: 'varies', hours: createDefaultHours() }
  }
  if (
    noteText.includes(HOURS_AVAILABILITY_LABELS.contact_for_hours.toLowerCase()) ||
    noteText.includes('contact the resource for hours')
  ) {
    return { hoursAvailability: 'contact_for_hours', hours: createDefaultHours() }
  }

  if (rows.length === 0) {
    return { hoursAvailability: 'contact_for_hours', hours: createDefaultHours() }
  }

  const byDay = new Map<number, ResourceHourDto>()
  for (const row of rows) {
    if (!byDay.has(row.day_of_week)) byDay.set(row.day_of_week, row)
  }

  const hours = createDefaultHours().map((day) => {
    const row = byDay.get(day.dayOfWeek)
    if (!row) {
      return { ...day, isClosed: true, opensAt: '', closesAt: '', byAppointment: false }
    }
    return {
      dayOfWeek: day.dayOfWeek,
      isClosed: Boolean(row.is_closed),
      opensAt: truncateTime(row.opens_at) || '09:00',
      closesAt: truncateTime(row.closes_at) || '17:00',
      byAppointment: Boolean(row.by_appointment_only),
    }
  })

  return { hoursAvailability: 'structured', hours }
}

function truncateTime(value: string | null): string {
  if (!value) return ''
  return value.length >= 5 ? value.slice(0, 5) : value
}
