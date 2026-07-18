import type {
  EventContributionData,
  ExistingResourceLocation,
} from '@/types/submission'
import { EVENT_NAME_MAX_LENGTH } from '@/types/submission'
import { PHONE_VALIDATION_MESSAGE } from '@/utils/phone'
import {
  DUPLICATE_LOCATION_MESSAGE,
  isDuplicateLocation,
} from '../form/locationIdentity'
import {
  validateLocationFields,
  type LocationFieldErrors,
} from '../form/locationFieldValidation'
import {
  isValidEmail,
  isValidPhone,
  isValidUrl,
} from '../existingResource/validation'

export type { LocationFieldErrors }

export interface EventFieldErrors {
  name?: string
  description?: string
  scheduleKind?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  frequency?: string
  frequencyOther?: string
  recurrenceWeekdays?: string
  recurrenceEndDate?: string
  recurrenceOccurrences?: string
  accessMode?: string
  locations?: string
  locationFields?: Record<string, LocationFieldErrors>
  onlineUrl?: string
  categories?: string
  registrationMode?: string
  contacts?: string
  contactValues?: Record<string, string>
  costDetails?: string
  moreInfoUrl?: string
  relationship?: string
  relationshipOther?: string
}

function needsPhysical(data: EventContributionData): boolean {
  return data.accessMode === 'physical' || data.accessMode === 'both'
}

function needsOnline(data: EventContributionData): boolean {
  return data.accessMode === 'online' || data.accessMode === 'both'
}

function validateOneLocation(
  location: ExistingResourceLocation,
  index: number,
): LocationFieldErrors {
  return validateLocationFields(location, index)
}

export function validateSectionOverview(
  data: EventContributionData,
): EventFieldErrors {
  const errors: EventFieldErrors = {}
  const name = data.name.trim()
  if (!name) errors.name = 'Enter an event name.'
  else if (name.length > EVENT_NAME_MAX_LENGTH) {
    errors.name = `Name must be ${EVENT_NAME_MAX_LENGTH} characters or fewer.`
  }
  if (!data.description.trim()) {
    errors.description = 'Describe what the event is about and who it is for.'
  }
  return errors
}

export const END_TIME_ORDER_MESSAGE =
  'End time must be after the start time.'

export const END_DATE_ORDER_MESSAGE =
  'End date must be on or after the start date.'

/**
 * One-time events: end date cannot be before start date.
 */
export function getEndDateOrderError(
  data: EventContributionData,
): string | undefined {
  if (data.scheduleKind !== 'one_time') return undefined
  if (!data.startDate.trim() || !data.endDate.trim()) return undefined
  if (data.endDate < data.startDate) {
    return END_DATE_ORDER_MESSAGE
  }
  return undefined
}

/**
 * Returns an error when end time is not after start time on the same calendar day
 * (one-time) or for the occurrence window (recurring).
 */
export function getEndTimeOrderError(
  data: EventContributionData,
): string | undefined {
  if (!data.startTime.trim() || !data.endTime.trim()) return undefined

  if (data.scheduleKind === 'one_time') {
    const sameDay =
      !data.endDate.trim() || data.endDate.trim() === data.startDate.trim()
    if (sameDay && data.endTime <= data.startTime) {
      return END_TIME_ORDER_MESSAGE
    }
    return undefined
  }

  if (data.scheduleKind === 'recurring') {
    if (data.endTime <= data.startTime) {
      return END_TIME_ORDER_MESSAGE
    }
  }

  return undefined
}

export function validateSectionSchedule(
  data: EventContributionData,
): EventFieldErrors {
  const errors: EventFieldErrors = {}
  if (!data.scheduleKind) {
    errors.scheduleKind = 'Choose whether this event is one-time or recurring.'
    return errors
  }

  if (!data.startDate.trim()) {
    errors.startDate =
      data.scheduleKind === 'recurring'
        ? 'Enter the first occurrence date.'
        : 'Enter a start date.'
  }
  if (!data.startTime.trim()) {
    errors.startTime = 'Enter a start time.'
  }

  if (data.scheduleKind === 'one_time') {
    const endDateOrder = getEndDateOrderError(data)
    if (endDateOrder) {
      errors.endDate = endDateOrder
    }
  }

  if (data.scheduleKind === 'recurring') {
    if (!data.frequency) {
      errors.frequency = 'Choose how often the event repeats.'
    } else if (data.frequency === 'other' && !data.frequencyOther.trim()) {
      errors.frequencyOther = 'Describe the schedule.'
    } else if (
      (data.frequency === 'weekly' || data.frequency === 'biweekly') &&
      data.recurrenceWeekdays.length === 0
    ) {
      errors.recurrenceWeekdays = 'Select at least one day the event occurs.'
    }

    if (data.recurrenceEndKind === 'end_date') {
      if (!data.recurrenceEndDate.trim()) {
        errors.recurrenceEndDate = 'Enter when the recurring event ends.'
      } else if (
        data.startDate.trim() &&
        data.recurrenceEndDate < data.startDate
      ) {
        errors.recurrenceEndDate =
          'The end date cannot be before the first occurrence.'
      }
    }

    if (data.recurrenceEndKind === 'occurrences') {
      const n = Number.parseInt(data.recurrenceOccurrences.trim(), 10)
      if (!data.recurrenceOccurrences.trim() || !Number.isFinite(n) || n < 1) {
        errors.recurrenceOccurrences =
          'Enter a positive whole number of occurrences.'
      }
    }
  }

  const endTimeOrder = getEndTimeOrderError(data)
  if (endTimeOrder) {
    errors.endTime = endTimeOrder
  }

  return errors
}

export function validateSectionLocation(
  data: EventContributionData,
): EventFieldErrors {
  const errors: EventFieldErrors = {}
  if (!data.accessMode) {
    errors.accessMode = 'Choose where the event is happening.'
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
      for (let i = 0; i < data.locations.length; i++) {
        const current = data.locations[i]
        const duplicateOfEarlier = data.locations
          .slice(0, i)
          .some((earlier) => isDuplicateLocation(earlier, current))
        if (!duplicateOfEarlier) continue
        locationFields[current.id] = {
          ...locationFields[current.id],
          streetAddress: DUPLICATE_LOCATION_MESSAGE,
        }
      }
      if (Object.keys(locationFields).length > 0) {
        errors.locationFields = locationFields
        errors.locations = 'Fix the highlighted location details.'
      }
    }
  }

  if (needsOnline(data)) {
    if (!data.onlineUrl.trim()) {
      errors.onlineUrl = 'Enter an online event link.'
    } else if (!isValidUrl(data.onlineUrl)) {
      errors.onlineUrl = 'Enter a valid website address.'
    }
  }

  return errors
}

export function validateSectionCategories(
  data: EventContributionData,
): EventFieldErrors {
  const errors: EventFieldErrors = {}
  if (data.categoryIds.length === 0) {
    errors.categories = 'Select at least one category.'
  }
  return errors
}

export function validateSectionRegistration(
  data: EventContributionData,
): EventFieldErrors {
  const errors: EventFieldErrors = {}
  if (!data.registrationMode) {
    errors.registrationMode = 'Tell us whether registration is required.'
  }

  const contactValues: Record<string, string> = {}
  const filled = data.contacts.filter((c) => c.value.trim())
  if (filled.length === 0) {
    errors.contacts = 'Add at least one public event contact method.'
  } else {
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
  }

  return errors
}

export function validateSectionAdditional(
  data: EventContributionData,
): EventFieldErrors {
  const errors: EventFieldErrors = {}
  if (data.costOption === 'other' && !data.costDetails.trim()) {
    errors.costDetails = 'Please describe the cost.'
  }
  if (data.moreInfoUrl.trim() && !isValidUrl(data.moreInfoUrl)) {
    errors.moreInfoUrl = 'Enter a valid website address.'
  }
  return errors
}

export function validateSectionRelationship(
  data: EventContributionData,
): EventFieldErrors {
  const errors: EventFieldErrors = {}
  if (!data.relationship) {
    errors.relationship = 'Tell us how you are connected to this event.'
  } else if (data.relationship === 'other' && !data.relationshipOther.trim()) {
    errors.relationshipOther = 'Please add a short explanation.'
  }
  return errors
}

export function validateEventContribution(
  data: EventContributionData,
): EventFieldErrors {
  return {
    ...validateSectionOverview(data),
    ...validateSectionSchedule(data),
    ...validateSectionLocation(data),
    ...validateSectionCategories(data),
    ...validateSectionRegistration(data),
    ...validateSectionAdditional(data),
    ...validateSectionRelationship(data),
  }
}

export function isEventContributionComplete(
  data: EventContributionData,
): boolean {
  return Object.keys(validateEventContribution(data)).length === 0
}

/** Progressive disclosure: which sections are unlocked (1–7). */
export function getRevealedEventSections(data: EventContributionData): number {
  let revealed = 1
  if (Object.keys(validateSectionOverview(data)).length === 0) revealed = 2
  if (revealed >= 2 && Object.keys(validateSectionSchedule(data)).length === 0) {
    revealed = 3
  }
  if (revealed >= 3 && Object.keys(validateSectionLocation(data)).length === 0) {
    revealed = 4
  }
  if (
    revealed >= 4 &&
    Object.keys(validateSectionCategories(data)).length === 0
  ) {
    revealed = 5
  }
  if (
    revealed >= 5 &&
    Object.keys(validateSectionRegistration(data)).length === 0
  ) {
    revealed = 6
  }
  if (revealed >= 6) {
    // Section 6 is optional — unlock connection (7) immediately.
    revealed = 7
  }
  return revealed
}

export const EVENT_SECTIONS = [
  'Overview',
  'Schedule',
  'Location',
  'Categories',
  'Attend',
  'Details',
  'Connection',
] as const
