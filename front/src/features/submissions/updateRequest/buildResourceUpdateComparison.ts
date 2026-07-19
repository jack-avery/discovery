import type {
  DayHours,
  ExistingResourceData,
  ExistingResourceLocation,
  HoursAvailability,
  ResourceContactMethod,
} from '@/types/submission'
import {
  ACCESS_MODE_LABELS,
  COST_LABELS,
  HOURS_AVAILABILITY_LABELS,
  WEEKDAY_DISPLAY,
} from '../mappers/labels'
import { mapResourceCostDescription } from '../mappers/cost'
import { buildQuarterHourOptions } from '../form/TimeSelect'
import {
  UPDATE_SECTION_OPTIONS,
  type UpdateSectionId,
} from './updateSections'

const EMPTY_VALUE = 'Not provided'

const TIME_LABELS = new Map(
  buildQuarterHourOptions().map((option) => [option.value, option.label]),
)

export interface ResourceUpdateComparisonField {
  id: string
  label: string
  current: string
  proposed: string
}

export interface ResourceUpdateComparisonSection {
  id: UpdateSectionId
  label: string
  fields: ResourceUpdateComparisonField[]
}

export interface ResourceUpdateComparison {
  sections: ResourceUpdateComparisonSection[]
}

export interface ResourceUpdateComparisonLookups {
  categoryNames?: Record<number, string>
  tagNames?: Record<number, string>
}

/**
 * Pure baseline-vs-proposed model for update review and future staff moderation.
 * Only includes sections/fields that actually changed.
 */
export function buildResourceUpdateComparison(
  baseline: ExistingResourceData,
  proposed: ExistingResourceData,
  lookups: ResourceUpdateComparisonLookups = {},
): ResourceUpdateComparison {
  const sections: ResourceUpdateComparisonSection[] = []

  for (const option of UPDATE_SECTION_OPTIONS) {
    const fields = buildSectionFields(
      option.id,
      baseline,
      proposed,
      lookups,
    ).filter((field) => field.current !== field.proposed)
    if (fields.length === 0) continue
    sections.push({
      id: option.id,
      label: option.label,
      fields,
    })
  }

  return { sections }
}

function buildSectionFields(
  sectionId: UpdateSectionId,
  baseline: ExistingResourceData,
  proposed: ExistingResourceData,
  lookups: ResourceUpdateComparisonLookups,
): ResourceUpdateComparisonField[] {
  switch (sectionId) {
    case 'about':
      return [
        field('name', 'Name', baseline.name, proposed.name),
        field(
          'description',
          'Description',
          baseline.description,
          proposed.description,
        ),
        field(
          'generalNotes',
          'Notes for staff',
          baseline.generalNotes,
          proposed.generalNotes,
        ),
      ]
    case 'hours':
      return [
        field(
          'hours',
          'Hours',
          formatHours(baseline.hoursAvailability, baseline.hours),
          formatHours(proposed.hoursAvailability, proposed.hours),
        ),
      ]
    case 'contact':
      return [
        field(
          'contacts',
          'Contact information',
          formatContacts(
            baseline.contacts.filter((contact) => contact.type !== 'website'),
          ),
          formatContacts(
            proposed.contacts.filter((contact) => contact.type !== 'website'),
          ),
        ),
      ]
    case 'address':
      return [
        field(
          'accessMode',
          'How people can access this resource',
          baseline.accessMode
            ? ACCESS_MODE_LABELS[baseline.accessMode]
            : '',
          proposed.accessMode
            ? ACCESS_MODE_LABELS[proposed.accessMode]
            : '',
        ),
        field(
          'locations',
          'Locations',
          formatLocations(baseline.locations),
          formatLocations(proposed.locations),
        ),
        field(
          'onlineUrl',
          'Website or online link',
          baseline.onlineUrl,
          proposed.onlineUrl,
        ),
      ]
    case 'categories':
      return [
        field(
          'categories',
          'Categories',
          formatIdList(baseline.categoryIds, lookups.categoryNames),
          formatIdList(proposed.categoryIds, lookups.categoryNames),
        ),
        field(
          'filters',
          'Filters',
          formatIdList(baseline.filterIds, lookups.tagNames),
          formatIdList(proposed.filterIds, lookups.tagNames),
        ),
      ]
    case 'accessibility':
      return [
        field(
          'accessibilityNotes',
          'Accessibility',
          baseline.accessibilityNotes,
          proposed.accessibilityNotes,
        ),
      ]
    case 'cost':
      return [
        field(
          'cost',
          'Cost',
          formatCost(baseline.costOption, baseline.costDetails),
          formatCost(proposed.costOption, proposed.costDetails),
        ),
      ]
    case 'website':
      return [
        field(
          'moreInfoUrl',
          'More information',
          baseline.moreInfoUrl,
          proposed.moreInfoUrl,
        ),
        field(
          'websites',
          'Website contacts',
          formatContacts(
            baseline.contacts.filter((contact) => contact.type === 'website'),
          ),
          formatContacts(
            proposed.contacts.filter((contact) => contact.type === 'website'),
          ),
        ),
      ]
    case 'other':
      return [
        field(
          'eligibility',
          'Who can use this resource',
          baseline.eligibility,
          proposed.eligibility,
        ),
      ]
    default: {
      const exhaustive: never = sectionId
      return exhaustive
    }
  }
}

function field(
  id: string,
  label: string,
  currentRaw: string,
  proposedRaw: string,
): ResourceUpdateComparisonField {
  return {
    id,
    label,
    current: displayValue(currentRaw),
    proposed: displayValue(proposedRaw),
  }
}

function displayValue(value: string): string {
  const trimmed = value.trim()
  return trimmed || EMPTY_VALUE
}

function formatCost(
  costOption: ExistingResourceData['costOption'],
  costDetails: string,
): string {
  const mapped = mapResourceCostDescription(costOption, costDetails)
  if (mapped) return mapped
  if (costOption) return COST_LABELS[costOption]
  return ''
}

function formatIdList(
  ids: number[],
  names?: Record<number, string>,
): string {
  if (ids.length === 0) return ''
  const sorted = [...ids].sort((a, b) => a - b)
  return sorted
    .map((id) => names?.[id]?.trim() || `ID ${id}`)
    .join(', ')
}

function formatContacts(contacts: ResourceContactMethod[]): string {
  const lines = contacts
    .map((contact) => {
      const value = contact.value.trim()
      if (!value) return null
      const label = contact.label.trim()
      const type = contact.type
      if (label) return `${label} (${type}): ${value}`
      return `${type}: ${value}`
    })
    .filter((line): line is string => Boolean(line))
    .sort((a, b) => a.localeCompare(b))
  return lines.join('\n')
}

function formatLocations(locations: ExistingResourceLocation[]): string {
  if (locations.length === 0) return ''
  return locations
    .map((location) => {
      const parts = [
        location.locationName.trim(),
        [location.streetAddress.trim(), location.unit.trim()]
          .filter(Boolean)
          .join(', '),
        [location.city.trim(), location.province.trim()]
          .filter(Boolean)
          .join(', '),
        location.postalCode.trim(),
      ].filter(Boolean)
      return parts.join('\n')
    })
    .join('\n\n')
}

function formatHours(
  availability: HoursAvailability,
  hours: DayHours[],
): string {
  if (availability !== 'structured') {
    return HOURS_AVAILABILITY_LABELS[availability]
  }

  const lines = hours
    .slice()
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((day) => {
      const dayLabel = WEEKDAY_DISPLAY[day.dayOfWeek] ?? `Day ${day.dayOfWeek}`
      if (day.isClosed) return `${dayLabel}: Closed`
      if (day.byAppointment) return `${dayLabel}: By appointment`
      const opens = formatTime(day.opensAt)
      const closes = formatTime(day.closesAt)
      if (!opens || !closes) return `${dayLabel}: Hours incomplete`
      return `${dayLabel}: ${opens} – ${closes}`
    })

  return lines.join('\n')
}

function formatTime(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return TIME_LABELS.get(trimmed) ?? trimmed
}
