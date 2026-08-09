import type {
  DayHours,
  ExistingResourceData,
  ExistingResourceLocation,
  HoursAvailability,
  ResourceContactMethod,
} from '@/types/submission'
import { areContactsEquivalent } from '@/features/submissions/contacts/contactEquality'

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
 * Reviewer working values for collection fields (always held while reviewing).
 * Edited vs proposed is derived via structural slice equality — not edit history.
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

/** Live editor drafts for structured Update-review fields. */
export interface ResourceUpdateStructuredWorkingValues {
  contacts: ResourceContactMethod[]
  locations: ExistingResourceLocation[]
  hours: {
    hoursAvailability: HoursAvailability
    hours: DayHours[]
  }
}

export function createStructuredWorkingValues(
  proposed: ExistingResourceData,
): ResourceUpdateStructuredWorkingValues {
  return {
    contacts: structuredClone(nonWebsiteContacts(proposed.contacts)),
    locations: structuredClone(proposed.locations),
    hours: {
      hoursAvailability: proposed.hoursAvailability,
      hours: structuredClone(proposed.hours),
    },
  }
}

/**
 * Sparse compose overrides: only slices that structurally differ from proposed.
 */
export function structuredEditsFromWorking(
  proposed: ExistingResourceData,
  working: ResourceUpdateStructuredWorkingValues,
): ResourceUpdateStructuredEdits {
  const edits: ResourceUpdateStructuredEdits = {}

  if (
    !areContactSlicesEqual(
      working.contacts,
      nonWebsiteContacts(proposed.contacts),
    )
  ) {
    edits['contact:contacts'] = working.contacts
  }

  if (!areLocationSlicesEqual(working.locations, proposed.locations)) {
    edits['address:locations'] = working.locations
  }

  if (
    !areHoursSlicesEqual(working.hours, {
      hoursAvailability: proposed.hoursAvailability,
      hours: proposed.hours,
    })
  ) {
    edits['hours:hours'] = working.hours
  }

  return edits
}

export function isStructuredWorkingFieldEdited(
  fieldId: ResourceUpdateStructuredFieldId,
  proposed: ExistingResourceData,
  working: ResourceUpdateStructuredWorkingValues,
): boolean {
  switch (fieldId) {
    case 'contact:contacts':
      return !areContactSlicesEqual(
        working.contacts,
        nonWebsiteContacts(proposed.contacts),
      )
    case 'address:locations':
      return !areLocationSlicesEqual(working.locations, proposed.locations)
    case 'hours:hours':
      return !areHoursSlicesEqual(working.hours, {
        hoursAvailability: proposed.hoursAvailability,
        hours: proposed.hours,
      })
    default: {
      const exhaustive: never = fieldId
      return exhaustive
    }
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

/** Contact slice equality — delegates to shared {@link areContactsEquivalent}. */
export function areContactSlicesEqual(
  a: ResourceContactMethod[],
  b: ResourceContactMethod[],
): boolean {
  return areContactsEquivalent(a, b)
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
