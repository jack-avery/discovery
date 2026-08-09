import type { ExistingResourceData } from '@/types/submission'
import {
  validateExistingResource,
  type FieldErrors,
} from '../existingResource/validation'
import { canonicalizeContacts } from '../contacts/contactEquality'
import type { UpdateSectionId } from './updateSections'
import { UPDATE_SECTION_IDS } from './updateSections'

/**
 * Compare update-editor data against the prefilled baseline.
 * Only value changes count; restoring originals clears the section marker.
 */
export function getEditedUpdateSections(
  baseline: ExistingResourceData,
  current: ExistingResourceData,
): UpdateSectionId[] {
  return UPDATE_SECTION_IDS.filter(
    (sectionId) =>
      stableStringify(sectionSnapshot(baseline, sectionId)) !==
      stableStringify(sectionSnapshot(current, sectionId)),
  )
}

export function hasResourceDataChanges(
  baseline: ExistingResourceData,
  current: ExistingResourceData,
): boolean {
  return getEditedUpdateSections(baseline, current).length > 0
}

/**
 * First invalid section in editor display order.
 * Used to auto-expand when submit validation fails.
 */
export function getFirstInvalidUpdateSection(
  data: ExistingResourceData,
): UpdateSectionId | null {
  return mapFieldErrorsToUpdateSection(validateExistingResource(data))
}

function mapFieldErrorsToUpdateSection(
  errors: FieldErrors,
): UpdateSectionId | null {
  if (errors.name || errors.description) return 'about'
  if (errors.categories) return 'categories'
  if (errors.contacts || errors.contactValues) return 'contact'
  if (errors.accessMode || errors.locations || errors.locationFields || errors.onlineUrl) {
    return 'address'
  }
  if (errors.hours) return 'hours'
  if (errors.moreInfoUrl) return 'website'
  if (errors.costDetails) return 'cost'
  return null
}

function sectionSnapshot(
  data: ExistingResourceData,
  sectionId: UpdateSectionId,
): unknown {
  switch (sectionId) {
    case 'about':
      return {
        name: data.name.trim(),
        description: data.description.trim(),
      }
    case 'hours':
      return {
        hoursAvailability: data.hoursAvailability,
        hours: data.hours.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          isClosed: day.isClosed,
          opensAt: day.opensAt,
          closesAt: day.closesAt,
          byAppointment: day.byAppointment,
        })),
      }
    case 'contact':
      return canonicalizeContacts(
        data.contacts.filter((contact) => contact.type !== 'website'),
      )
    case 'address':
      return {
        accessMode: data.accessMode,
        locations: data.locations.map((location) => ({
          locationName: location.locationName.trim(),
          streetAddress: location.streetAddress.trim(),
          unit: location.unit.trim(),
          city: location.city.trim(),
          province: location.province.trim(),
          postalCode: location.postalCode.trim(),
          lat: location.lat,
          lng: location.lng,
        })),
        onlineUrl: data.onlineUrl.trim(),
      }
    case 'categories':
      return {
        categoryIds: [...data.categoryIds].sort((a, b) => a - b),
        filterIds: [...data.filterIds].sort((a, b) => a - b),
      }
    case 'accessibility':
      return { accessibilityNotes: data.accessibilityNotes.trim() }
    case 'cost':
      return {
        costOption: data.costOption,
        costDetails: data.costDetails.trim(),
      }
    case 'website':
      return {
        moreInfoUrl: data.moreInfoUrl.trim(),
        websites: canonicalizeContacts(
          data.contacts.filter((contact) => contact.type === 'website'),
        ),
      }
    case 'other':
      return {
        eligibility: data.eligibility.trim(),
      }
    default: {
      const exhaustive: never = sectionId
      return exhaustive
    }
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value)
}
