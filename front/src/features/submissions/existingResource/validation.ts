import type {
  ExistingResourceData,
  ExistingResourceLocation,
} from '@/types/submission'
import { RESOURCE_NAME_MAX_LENGTH } from '@/types/submission'
import {
  isValidNorthAmericanPhone,
  PHONE_VALIDATION_MESSAGE,
} from '@/utils/phone'
import {
  DUPLICATE_LOCATION_MESSAGE,
  isDuplicateLocation,
} from '../form/locationIdentity'
import {
  validateLocationFields,
  type LocationFieldErrors,
} from '../form/locationFieldValidation'

export type { LocationFieldErrors }

export interface FieldErrors {
  name?: string
  description?: string
  categories?: string
  accessMode?: string
  locations?: string
  /** Per-location field errors, keyed by location id. */
  locationFields?: Record<string, LocationFieldErrors>
  onlineUrl?: string
  contacts?: string
  contactValues?: Record<string, string>
  hours?: string
  relationship?: string
  relationshipOther?: string
  costDetails?: string
  moreInfoUrl?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const url = new URL(withProtocol)
    return Boolean(url.hostname && url.hostname.includes('.'))
  } catch {
    return false
  }
}

/** Canada/US numbers via libphonenumber — kept name for existing imports. */
export function isValidPhone(value: string): boolean {
  return isValidNorthAmericanPhone(value)
}

function applyDuplicateLocationErrors(
  locations: ExistingResourceLocation[],
  locationFields: Record<string, LocationFieldErrors>,
): void {
  for (let i = 0; i < locations.length; i++) {
    const current = locations[i]
    const duplicateOfEarlier = locations
      .slice(0, i)
      .some((earlier) => isDuplicateLocation(earlier, current))
    if (!duplicateOfEarlier) continue
    locationFields[current.id] = {
      ...locationFields[current.id],
      streetAddress: DUPLICATE_LOCATION_MESSAGE,
    }
  }
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

function needsPhysical(data: ExistingResourceData): boolean {
  return data.accessMode === 'physical' || data.accessMode === 'both'
}

function needsOnline(data: ExistingResourceData): boolean {
  return data.accessMode === 'online' || data.accessMode === 'both'
}

function validateOneLocation(
  location: ExistingResourceLocation,
  index: number,
): LocationFieldErrors {
  return validateLocationFields(location, index)
}

export function validateSectionAbout(data: ExistingResourceData): FieldErrors {
  const errors: FieldErrors = {}
  const name = data.name.trim()
  if (!name) errors.name = 'Enter a resource name.'
  else if (name.length > RESOURCE_NAME_MAX_LENGTH) {
    errors.name = `Name must be ${RESOURCE_NAME_MAX_LENGTH} characters or fewer.`
  }
  if (!data.description.trim()) {
    errors.description = 'Describe what this resource provides.'
  }
  return errors
}

export function validateSectionCategories(
  data: ExistingResourceData,
): FieldErrors {
  const errors: FieldErrors = {}
  if (data.categoryIds.length === 0) {
    errors.categories = 'Select at least one category.'
  }
  return errors
}

export function validateSectionAccess(data: ExistingResourceData): FieldErrors {
  const errors: FieldErrors = {}
  if (!data.accessMode) {
    errors.accessMode = 'Choose how people can access this resource.'
    return errors
  }

  if (needsPhysical(data)) {
    if (!data.locations.length) {
      errors.locations = 'Add at least one physical location.'
    } else {
      const locationFields: Record<string, LocationFieldErrors> = {}
      data.locations.forEach((location, index) => {
        const fieldErrors = validateOneLocation(location, index)
        if (Object.keys(fieldErrors).length > 0) {
          locationFields[location.id] = fieldErrors
        }
      })
      applyDuplicateLocationErrors(data.locations, locationFields)
      if (Object.keys(locationFields).length > 0) {
        errors.locationFields = locationFields
        errors.locations = 'Fix the highlighted location details.'
      }
    }
  }

  if (needsOnline(data)) {
    if (!data.onlineUrl.trim()) {
      errors.onlineUrl = 'Enter a website or online link.'
    } else if (!isValidUrl(data.onlineUrl)) {
      errors.onlineUrl = 'Enter a valid website address.'
    }
  }

  if (data.hoursAvailability === 'structured') {
    for (const day of data.hours) {
      if (day.isClosed || day.byAppointment) continue
      if (day.opensAt && day.closesAt && day.opensAt >= day.closesAt) {
        errors.hours =
          'Opening time must be earlier than closing time for each open day.'
        break
      }
    }
  }

  return errors
}

export function validateSectionContacts(
  data: ExistingResourceData,
): FieldErrors {
  const errors: FieldErrors = {}
  const contactValues: Record<string, string> = {}
  const filled = data.contacts.filter((c) => c.value.trim())

  if (filled.length === 0) {
    errors.contacts = 'Add at least one public contact method.'
    return errors
  }

  for (const contact of filled) {
    const value = contact.value.trim()
    if (contact.type === 'email' && !isValidEmail(value)) {
      contactValues[contact.id] = 'Enter a valid email address.'
    } else if (contact.type === 'phone' && !isValidPhone(value)) {
      contactValues[contact.id] = PHONE_VALIDATION_MESSAGE
    } else if (
      (contact.type === 'website' || contact.type === 'other') &&
      !isValidUrl(value)
    ) {
      contactValues[contact.id] = 'Enter a valid link.'
    }
  }

  if (Object.keys(contactValues).length > 0) {
    errors.contactValues = contactValues
    errors.contacts = 'Fix the highlighted contact details.'
  }

  return errors
}

export function validateSectionAdditional(
  data: ExistingResourceData,
): FieldErrors {
  const errors: FieldErrors = {}
  if (data.costOption === 'other' && !data.costDetails.trim()) {
    errors.costDetails = 'Please describe the cost.'
  }
  if (data.moreInfoUrl.trim() && !isValidUrl(data.moreInfoUrl)) {
    errors.moreInfoUrl = 'Enter a valid website address.'
  }
  return errors
}

export function validateSectionRelationship(
  data: ExistingResourceData,
): FieldErrors {
  const errors: FieldErrors = {}
  if (!data.relationship) {
    errors.relationship = 'Tell us how you are connected to this resource.'
  } else if (
    data.relationship === 'other' &&
    !data.relationshipOther.trim()
  ) {
    errors.relationshipOther = 'Please add a short explanation.'
  }
  return errors
}

export function validateExistingResource(
  data: ExistingResourceData,
): FieldErrors {
  return {
    ...validateSectionAbout(data),
    ...validateSectionCategories(data),
    ...validateSectionAccess(data),
    ...validateSectionContacts(data),
    ...validateSectionAdditional(data),
    ...validateSectionRelationship(data),
  }
}

export function isExistingResourceComplete(data: ExistingResourceData): boolean {
  const errors = validateExistingResource(data)
  return (
    !errors.name &&
    !errors.description &&
    !errors.categories &&
    !errors.accessMode &&
    !errors.locations &&
    !errors.locationFields &&
    !errors.onlineUrl &&
    !errors.contacts &&
    !errors.contactValues &&
    !errors.hours &&
    !errors.relationship &&
    !errors.relationshipOther &&
    !errors.costDetails &&
    !errors.moreInfoUrl
  )
}

/** Progressive disclosure: which sections are unlocked. */
export function getRevealedSections(data: ExistingResourceData): number {
  let revealed = 1
  if (Object.keys(validateSectionAbout(data)).length === 0) revealed = 2
  if (
    revealed >= 2 &&
    Object.keys(validateSectionCategories(data)).length === 0
  ) {
    revealed = 3
  }
  if (revealed >= 3 && Object.keys(validateSectionAccess(data)).length === 0) {
    revealed = 4
  }
  if (
    revealed >= 4 &&
    Object.keys(validateSectionContacts(data)).length === 0
  ) {
    revealed = 5
  }
  if (revealed >= 5) {
    revealed = 6
  }
  return revealed
}

export const EXISTING_RESOURCE_SECTIONS = [
  'About',
  'Categories',
  'Access',
  'Contact',
  'Details',
  'Connection',
] as const
