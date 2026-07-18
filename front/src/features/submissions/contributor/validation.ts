import type { ContributorInfo } from '@/types/submission'
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
}

export function validateContributor(
  contributor: ContributorInfo,
): ContributorFieldErrors {
  const errors: ContributorFieldErrors = {}
  const name = contributor.name.trim()
  if (!name) errors.name = 'Enter your full name.'
  else if (name.length > CONTRIBUTOR_NAME_MAX_LENGTH) {
    errors.name = `Name must be ${CONTRIBUTOR_NAME_MAX_LENGTH} characters or fewer.`
  }

  const email = contributor.email.trim()
  if (!email) errors.email = 'Enter your email address.'
  else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!contributor.preferredContactMethod) {
    errors.preferredContactMethod = 'Choose a preferred contact method.'
  }

  if (contributor.preferredContactMethod === 'phone') {
    if (!contributor.phone.trim()) {
      errors.phone =
        'Enter a phone number so we can reach you that way.'
    } else if (!isValidNorthAmericanPhone(contributor.phone)) {
      errors.phone = PHONE_VALIDATION_MESSAGE
    }
  } else if (
    contributor.phone.trim() &&
    !isValidNorthAmericanPhone(contributor.phone)
  ) {
    errors.phone = PHONE_VALIDATION_MESSAGE
  }

  return errors
}

export function isContributorComplete(contributor: ContributorInfo): boolean {
  return Object.keys(validateContributor(contributor)).length === 0
}
