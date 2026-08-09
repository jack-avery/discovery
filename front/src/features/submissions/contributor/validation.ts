import type {
  ContributorInfo,
  RelationshipOption,
} from '@/types/submission'
import { CONTRIBUTOR_NAME_MAX_LENGTH } from '@/types/submission'
import {
  isValidNorthAmericanPhone,
  PHONE_VALIDATION_MESSAGE,
} from '@/utils/phone'
import { isValidEmail } from '../existingResource/validation'

export interface ContributorFieldErrors {
  name?: string
  email?: string
  phone?: string
  preferredContactMethod?: string
  relationship?: string
  relationshipOther?: string
}

export interface ContributorValidationOptions {
  /** When true, require Your connection to this resource. */
  requireResourceConnection?: boolean
}

export const RESOURCE_RELATIONSHIP_OPTIONS: {
  value: RelationshipOption
  label: string
}[] = [
  { value: 'represent', label: 'I represent this organization or service' },
  { value: 'volunteer', label: 'I volunteer here' },
  { value: 'user', label: 'I use this resource' },
  { value: 'someone_told_me', label: 'Someone told me about it' },
  { value: 'public_info', label: 'I found it through public information' },
  { value: 'other', label: 'Other' },
]

/**
 * Contributor contact rules:
 * - Full name required
 * - At least one of email or phone required
 * - Preferred contact method required and must match a populated field
 */
export function validateContributor(
  contributor: ContributorInfo,
  options: ContributorValidationOptions = {},
): ContributorFieldErrors {
  const { requireResourceConnection = false } = options
  const errors: ContributorFieldErrors = {}
  const name = contributor.name.trim()
  if (!name) errors.name = 'Enter your full name.'
  else if (name.length > CONTRIBUTOR_NAME_MAX_LENGTH) {
    errors.name = `Name must be ${CONTRIBUTOR_NAME_MAX_LENGTH} characters or fewer.`
  }

  const email = contributor.email.trim()
  const phone = contributor.phone.trim()
  const hasEmail = Boolean(email)
  const hasPhone = Boolean(phone)
  const preferred = contributor.preferredContactMethod

  if (hasEmail && !isValidEmail(email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (hasPhone && !isValidNorthAmericanPhone(phone)) {
    errors.phone = PHONE_VALIDATION_MESSAGE
  }

  if (!preferred) {
    errors.preferredContactMethod = 'Choose a preferred contact method.'
  }

  if (!hasEmail && !hasPhone) {
    if (preferred === 'phone') {
      errors.phone =
        errors.phone ?? 'Enter a phone number so we can reach you that way.'
    } else if (preferred === 'email') {
      errors.email =
        errors.email ?? 'Enter an email address so we can reach you that way.'
    } else {
      errors.email =
        errors.email ?? 'Enter an email address or phone number.'
      errors.phone =
        errors.phone ?? 'Enter an email address or phone number.'
    }
  } else if (preferred === 'email' && !hasEmail) {
    errors.email =
      errors.email ?? 'Enter an email address so we can reach you that way.'
  } else if (preferred === 'phone' && !hasPhone) {
    errors.phone =
      errors.phone ?? 'Enter a phone number so we can reach you that way.'
  }

  if (requireResourceConnection) {
    if (!contributor.relationship) {
      errors.relationship =
        'Tell us how you are connected to this resource.'
    } else if (
      contributor.relationship === 'other' &&
      !contributor.relationshipOther.trim()
    ) {
      errors.relationshipOther = 'Please add a short explanation.'
    }
  }

  return errors
}

export function isContributorComplete(
  contributor: ContributorInfo,
  options: ContributorValidationOptions = {},
): boolean {
  return Object.keys(validateContributor(contributor, options)).length === 0
}
