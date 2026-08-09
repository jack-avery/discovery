import type { ExistingResourceData } from '@/types/submission'
import type { FieldErrors } from '@/features/submissions/existingResource/validation'
import {
  nonWebsiteContacts,
  websiteContacts,
} from '@/features/submissions/updateRequest/resourceUpdateStructuredFields'

/**
 * Map shared ExistingResource FieldErrors onto Update comparison field ids.
 * Uses the same messages from validateExistingResource — no new copy.
 *
 * When composed data is available, contact value errors are partitioned onto
 * `contact:contacts` vs `website:websites` by contact type.
 */
export function fieldErrorForUpdateComparisonField(
  errors: FieldErrors,
  fieldId: string,
  composed: ExistingResourceData | null = null,
): string | undefined {
  switch (fieldId) {
    case 'about:name':
      return errors.name
    case 'about:description':
      return errors.description
    case 'contact:contacts':
      return contactSliceError(errors, composed, 'non-website')
    case 'website:websites':
      return contactSliceError(errors, composed, 'website')
    case 'address:accessMode':
      return errors.accessMode
    case 'address:locations':
      return errors.locations
    case 'address:onlineUrl':
      return errors.onlineUrl
    case 'hours:hours':
      return errors.hours
    case 'categories:categories':
      return errors.categories
    case 'cost:cost':
      return errors.costDetails
    case 'website:moreInfoUrl':
      return errors.moreInfoUrl
    default:
      return undefined
  }
}

function contactSliceError(
  errors: FieldErrors,
  composed: ExistingResourceData | null,
  slice: 'website' | 'non-website',
): string | undefined {
  if (!composed) {
    // Without composed contacts we cannot partition value errors; keep the
    // historical contacts-field association for the non-website field only.
    return slice === 'non-website' ? errors.contacts : undefined
  }

  const sliceContacts =
    slice === 'website'
      ? websiteContacts(composed.contacts)
      : nonWebsiteContacts(composed.contacts)
  const sliceIds = new Set(sliceContacts.map((contact) => contact.id))
  const valueErrors = errors.contactValues ?? {}
  const hasSliceValueError = Object.keys(valueErrors).some((id) =>
    sliceIds.has(id),
  )

  if (hasSliceValueError) {
    return errors.contacts
  }

  // "At least one contact" belongs on the non-website contacts field when the
  // composed resource has no filled contacts of any type.
  if (
    slice === 'non-website' &&
    errors.contacts &&
    Object.keys(valueErrors).length === 0
  ) {
    return errors.contacts
  }

  return undefined
}
