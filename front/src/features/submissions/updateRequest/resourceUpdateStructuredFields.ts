import type {
  AccessMode,
  DayHours,
  ExistingResourceData,
  ExistingResourceLocation,
  HoursAvailability,
  ResourceContactMethod,
} from '@/types/submission'
import { areContactsEquivalent } from '@/features/submissions/contacts/contactEquality'
import {
  areCostsEquivalent,
  type CostSlice,
} from '@/features/submissions/cost/costEquality'
import { areHoursEquivalent } from '@/features/submissions/hours/hoursEquality'
import { areLocationsEquivalent } from '@/features/submissions/locations/locationEquality'
import { areLookupIdSetsEquivalent } from '@/features/submissions/lookups/lookupIdEquality'

/** Comparison field ids that edit structured ExistingResourceData slices. */
export const RESOURCE_UPDATE_STRUCTURED_FIELD_IDS = [
  'contact:contacts',
  'website:websites',
  'address:accessMode',
  'address:locations',
  'categories:categories',
  'categories:filters',
  'cost:cost',
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
 * Reviewer working values for structured fields (always held while reviewing).
 * Edited vs proposed is derived via structural slice equality — not edit history.
 * Contacts and websites are independent slices of the same contacts array.
 */
export type ResourceUpdateStructuredEdits = {
  'contact:contacts'?: ResourceContactMethod[]
  'website:websites'?: ResourceContactMethod[]
  'address:accessMode'?: AccessMode | null
  'address:locations'?: ExistingResourceLocation[]
  'categories:categories'?: number[]
  'categories:filters'?: number[]
  'cost:cost'?: CostSlice
  'hours:hours'?: {
    hoursAvailability: HoursAvailability
    hours: DayHours[]
  }
}

/** Live editor drafts for structured Update-review fields. */
export interface ResourceUpdateStructuredWorkingValues {
  contacts: ResourceContactMethod[]
  websites: ResourceContactMethod[]
  accessMode: AccessMode | null
  locations: ExistingResourceLocation[]
  categoryIds: number[]
  filterIds: number[]
  cost: CostSlice
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
    websites: structuredClone(websiteContacts(proposed.contacts)),
    accessMode: proposed.accessMode,
    locations: structuredClone(proposed.locations),
    categoryIds: [...proposed.categoryIds],
    filterIds: [...proposed.filterIds],
    cost: {
      costOption: proposed.costOption,
      costDetails: proposed.costDetails,
    },
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

  if (
    !areContactSlicesEqual(
      working.websites,
      websiteContacts(proposed.contacts),
    )
  ) {
    edits['website:websites'] = working.websites
  }

  if (!areAccessModeSlicesEqual(working.accessMode, proposed.accessMode)) {
    edits['address:accessMode'] = working.accessMode
  }

  if (!areLocationSlicesEqual(working.locations, proposed.locations)) {
    edits['address:locations'] = working.locations
  }

  if (!areLookupIdSetsEquivalent(working.categoryIds, proposed.categoryIds)) {
    edits['categories:categories'] = [...working.categoryIds]
  }

  if (!areLookupIdSetsEquivalent(working.filterIds, proposed.filterIds)) {
    edits['categories:filters'] = [...working.filterIds]
  }

  if (
    !areCostSlicesEqual(working.cost, {
      costOption: proposed.costOption,
      costDetails: proposed.costDetails,
    })
  ) {
    edits['cost:cost'] = {
      costOption: working.cost.costOption,
      costDetails: working.cost.costDetails,
    }
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
    case 'website:websites':
      return !areContactSlicesEqual(
        working.websites,
        websiteContacts(proposed.contacts),
      )
    case 'address:accessMode':
      return !areAccessModeSlicesEqual(working.accessMode, proposed.accessMode)
    case 'address:locations':
      return !areLocationSlicesEqual(working.locations, proposed.locations)
    case 'categories:categories':
      return !areLookupIdSetsEquivalent(
        working.categoryIds,
        proposed.categoryIds,
      )
    case 'categories:filters':
      return !areLookupIdSetsEquivalent(working.filterIds, proposed.filterIds)
    case 'cost:cost':
      return !areCostSlicesEqual(working.cost, {
        costOption: proposed.costOption,
        costDetails: proposed.costDetails,
      })
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

/** Access Mode equality — raw enum / null identity. */
export function areAccessModeSlicesEqual(
  a: AccessMode | null,
  b: AccessMode | null,
): boolean {
  return a === b
}

/** Location slice equality — delegates to shared {@link areLocationsEquivalent}. */
export function areLocationSlicesEqual(
  a: ExistingResourceLocation[],
  b: ExistingResourceLocation[],
): boolean {
  return areLocationsEquivalent(a, b)
}

/** Hours slice equality — delegates to shared {@link areHoursEquivalent}. */
export function areHoursSlicesEqual(
  a: { hoursAvailability: HoursAvailability; hours: DayHours[] },
  b: { hoursAvailability: HoursAvailability; hours: DayHours[] },
): boolean {
  return areHoursEquivalent(a, b)
}

/** Category / filter ID bag equality — delegates to shared lookup-ID helper. */
export function areLookupIdSlicesEqual(a: number[], b: number[]): boolean {
  return areLookupIdSetsEquivalent(a, b)
}

/** Cost slice equality — delegates to shared {@link areCostsEquivalent}. */
export function areCostSlicesEqual(a: CostSlice, b: CostSlice): boolean {
  return areCostsEquivalent(a, b)
}

export function getProposedStructuredSlice(
  proposed: ExistingResourceData,
  fieldId: ResourceUpdateStructuredFieldId,
): ResourceUpdateStructuredEdits[ResourceUpdateStructuredFieldId] {
  switch (fieldId) {
    case 'contact:contacts':
      return structuredClone(nonWebsiteContacts(proposed.contacts))
    case 'website:websites':
      return structuredClone(websiteContacts(proposed.contacts))
    case 'address:accessMode':
      return proposed.accessMode
    case 'address:locations':
      return structuredClone(proposed.locations)
    case 'categories:categories':
      return [...proposed.categoryIds]
    case 'categories:filters':
      return [...proposed.filterIds]
    case 'cost:cost':
      return {
        costOption: proposed.costOption,
        costDetails: proposed.costDetails,
      }
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
