import type {
  DayHours,
  ExistingResourceData,
  ExistingResourceLocation,
  HoursAvailability,
  ResourceContactMethod,
} from '@/types/submission'

/** Comparison field ids that edit structured ExistingResourceData slices. */
export const RESOURCE_UPDATE_STRUCTURED_FIELD_IDS = [
  'contact:contacts',
  'address:locations',
  'hours:hours',
] as const

export type ResourceUpdateStructuredFieldId =
  (typeof RESOURCE_UPDATE_STRUCTURED_FIELD_IDS)[number]

export function isResourceUpdateStructuredFieldId(
  fieldId: string,
): fieldId is ResourceUpdateStructuredFieldId {
  return (RESOURCE_UPDATE_STRUCTURED_FIELD_IDS as readonly string[]).includes(
    fieldId,
  )
}

/**
 * Reviewer overrides for collection fields. Absent key = still at proposed.
 * Contacts store non-website methods only; websites stay on the resource model
 * via the separate website field / proposed contacts.
 */
export type ResourceUpdateStructuredEdits = {
  'contact:contacts'?: ResourceContactMethod[]
  'address:locations'?: ExistingResourceLocation[]
  'hours:hours'?: {
    hoursAvailability: HoursAvailability
    hours: DayHours[]
  }
}

export function nonWebsiteContacts(
  contacts: ResourceContactMethod[],
): ResourceContactMethod[] {
  return contacts.filter((contact) => contact.type !== 'website')
}

export function websiteContacts(
  contacts: ResourceContactMethod[],
): ResourceContactMethod[] {
  return contacts.filter((contact) => contact.type === 'website')
}

export function areContactSlicesEqual(
  a: ResourceContactMethod[],
  b: ResourceContactMethod[],
): boolean {
  return stableStringify(normalizeContacts(a)) === stableStringify(normalizeContacts(b))
}

/** Editor dirty check — includes empty rows so “Add contact” is not discarded. */
export function areContactEditorEqual(
  a: ResourceContactMethod[],
  b: ResourceContactMethod[],
): boolean {
  if (a.length !== b.length) return false
  return a.every(
    (contact, index) =>
      contact.type === b[index].type &&
      contact.value === b[index].value &&
      contact.label === b[index].label,
  )
}

export function areLocationSlicesEqual(
  a: ExistingResourceLocation[],
  b: ExistingResourceLocation[],
): boolean {
  return (
    stableStringify(normalizeLocations(a)) ===
    stableStringify(normalizeLocations(b))
  )
}

export function areHoursSlicesEqual(
  a: { hoursAvailability: HoursAvailability; hours: DayHours[] },
  b: { hoursAvailability: HoursAvailability; hours: DayHours[] },
): boolean {
  return (
    stableStringify(normalizeHours(a)) === stableStringify(normalizeHours(b))
  )
}

export function getProposedStructuredSlice(
  proposed: ExistingResourceData,
  fieldId: ResourceUpdateStructuredFieldId,
): ResourceUpdateStructuredEdits[ResourceUpdateStructuredFieldId] {
  switch (fieldId) {
    case 'contact:contacts':
      return structuredClone(nonWebsiteContacts(proposed.contacts))
    case 'address:locations':
      return structuredClone(proposed.locations)
    case 'hours:hours':
      return {
        hoursAvailability: proposed.hoursAvailability,
        hours: structuredClone(proposed.hours),
      }
    default: {
      const exhaustive: never = fieldId
      return exhaustive
    }
  }
}

function normalizeContacts(
  contacts: ResourceContactMethod[],
): Array<{ type: string; value: string; label: string }> {
  return contacts
    .map((contact) => ({
      type: contact.type,
      value: contact.value.trim(),
      label: contact.label.trim(),
    }))
    .filter((contact) => contact.value)
    .sort((a, b) =>
      `${a.type}:${a.value}:${a.label}`.localeCompare(
        `${b.type}:${b.value}:${b.label}`,
      ),
    )
}

function normalizeLocations(locations: ExistingResourceLocation[]) {
  return locations.map((location) => ({
    locationName: location.locationName.trim(),
    streetAddress: location.streetAddress.trim(),
    unit: location.unit.trim(),
    city: location.city.trim(),
    province: location.province.trim(),
    postalCode: location.postalCode.trim(),
    lat: location.lat,
    lng: location.lng,
  }))
}

function normalizeHours(slice: {
  hoursAvailability: HoursAvailability
  hours: DayHours[]
}) {
  return {
    hoursAvailability: slice.hoursAvailability,
    hours: slice.hours.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      isClosed: day.isClosed,
      opensAt: day.opensAt,
      closesAt: day.closesAt,
      byAppointment: day.byAppointment,
    })),
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value)
}
