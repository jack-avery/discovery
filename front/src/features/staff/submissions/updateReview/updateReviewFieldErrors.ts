import type { FieldErrors } from '@/features/submissions/existingResource/validation'

/**
 * Map shared ExistingResource FieldErrors onto Update comparison field ids.
 * Uses the same messages from validateExistingResource — no new copy.
 */
export function fieldErrorForUpdateComparisonField(
  errors: FieldErrors,
  fieldId: string,
): string | undefined {
  switch (fieldId) {
    case 'about:name':
      return errors.name
    case 'about:description':
      return errors.description
    case 'contact:contacts':
      return errors.contacts
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
