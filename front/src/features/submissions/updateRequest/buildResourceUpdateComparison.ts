import type {
  DayHours,
  ExistingResourceData,
  ExistingResourceLocation,
  HoursAvailability,
  ResourceContactMethod,
} from '@/types/submission'
import { createEmptyExistingResourceData } from '../existingResource/emptyState'
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
  /** Unique change identifier within a comparison (section-scoped). */
  id: string
  label: string
  /**
   * Current display value when {@link currentAvailable} is true.
   * Null when the live approved resource is not loaded yet.
   */
  current: string | null
  proposed: string
  /** False until the host can supply a baseline resource. */
  currentAvailable: boolean
  /** True when current and proposed display values differ (or baseline is missing). */
  changed: boolean
}

export interface ResourceUpdateComparisonSection {
  id: UpdateSectionId
  label: string
  /** Number of changed fields in this section. */
  changeCount: number
  /**
   * Section fields for review. Includes unchanged fields when a baseline is
   * present so hosts can reveal them; without a baseline, only proposed
   * content is included (current remains unavailable).
   */
  fields: ResourceUpdateComparisonField[]
}

export interface ResourceUpdateComparison {
  sections: ResourceUpdateComparisonSection[]
  /** True when a live baseline was provided for real Current values. */
  hasBaseline: boolean
  /** Total changed fields across all sections. */
  changeCount: number
}

export interface ResourceUpdateComparisonLookups {
  categoryNames?: Record<number, string>
  tagNames?: Record<number, string>
}

/**
 * Pure baseline-vs-proposed field set for update review and staff moderation.
 * No moderation state.
 *
 * Pass `baseline: null` when the live resource is not available — proposed
 * values still populate the set; Current remains unavailable and fields are
 * treated as changed for review purposes.
 */
export function buildResourceUpdateComparison(
  baseline: ExistingResourceData | null,
  proposed: ExistingResourceData,
  lookups: ResourceUpdateComparisonLookups = {},
): ResourceUpdateComparison {
  const hasBaseline = baseline != null
  const compareAgainst = baseline ?? createEmptyExistingResourceData()
  const sections: ResourceUpdateComparisonSection[] = []

  for (const option of UPDATE_SECTION_OPTIONS) {
    const fields = buildSectionFields(
      option.id,
      compareAgainst,
      proposed,
      lookups,
      hasBaseline,
    ).filter((field) => {
      if (!hasBaseline) {
        // Without a live baseline we cannot know true diffs — include fields
        // that carry proposed content so moderation UI remains usable.
        return field.proposed !== EMPTY_VALUE
      }
      // Keep empty↔empty rows out of the review surface.
      return field.current !== EMPTY_VALUE || field.proposed !== EMPTY_VALUE
    })
    if (fields.length === 0) continue
    const changeCount = fields.reduce(
      (count, field) => count + (field.changed ? 1 : 0),
      0,
    )
    sections.push({
      id: option.id,
      label: option.label,
      changeCount,
      fields,
    })
  }

  const changeCount = sections.reduce(
    (count, section) => count + section.changeCount,
    0,
  )

  return { sections, hasBaseline, changeCount }
}

function buildSectionFields(
  sectionId: UpdateSectionId,
  baseline: ExistingResourceData,
  proposed: ExistingResourceData,
  lookups: ResourceUpdateComparisonLookups,
  currentAvailable: boolean,
): ResourceUpdateComparisonField[] {
  switch (sectionId) {
    case 'about':
      return [
        field(sectionId, 'name', 'Name', baseline.name, proposed.name, currentAvailable),
        field(
          sectionId,
          'description',
          'Description',
          baseline.description,
          proposed.description,
          currentAvailable,
        ),
        field(
          sectionId,
          'generalNotes',
          'Notes for staff',
          baseline.generalNotes,
          proposed.generalNotes,
          currentAvailable,
        ),
      ]
    case 'hours':
      return [
        field(
          sectionId,
          'hours',
          'Hours',
          formatHours(baseline.hoursAvailability, baseline.hours),
          formatHours(proposed.hoursAvailability, proposed.hours),
          currentAvailable,
        ),
      ]
    case 'contact':
      return [
        field(
          sectionId,
          'contacts',
          'Contact information',
          formatContacts(
            baseline.contacts.filter((contact) => contact.type !== 'website'),
          ),
          formatContacts(
            proposed.contacts.filter((contact) => contact.type !== 'website'),
          ),
          currentAvailable,
        ),
      ]
    case 'address':
      return [
        field(
          sectionId,
          'accessMode',
          'How people can access this resource',
          baseline.accessMode
            ? ACCESS_MODE_LABELS[baseline.accessMode]
            : '',
          proposed.accessMode
            ? ACCESS_MODE_LABELS[proposed.accessMode]
            : '',
          currentAvailable,
        ),
        field(
          sectionId,
          'locations',
          'Locations',
          formatLocations(baseline.locations),
          formatLocations(proposed.locations),
          currentAvailable,
        ),
        field(
          sectionId,
          'onlineUrl',
          'Website or online link',
          baseline.onlineUrl,
          proposed.onlineUrl,
          currentAvailable,
        ),
      ]
    case 'categories':
      return [
        field(
          sectionId,
          'categories',
          'Categories',
          formatIdList(baseline.categoryIds, lookups.categoryNames),
          formatIdList(proposed.categoryIds, lookups.categoryNames),
          currentAvailable,
        ),
        field(
          sectionId,
          'filters',
          'Filters',
          formatIdList(baseline.filterIds, lookups.tagNames),
          formatIdList(proposed.filterIds, lookups.tagNames),
          currentAvailable,
        ),
      ]
    case 'accessibility':
      return [
        field(
          sectionId,
          'accessibilityNotes',
          'Accessibility',
          baseline.accessibilityNotes,
          proposed.accessibilityNotes,
          currentAvailable,
        ),
      ]
    case 'cost':
      return [
        field(
          sectionId,
          'cost',
          'Cost',
          formatCost(baseline.costOption, baseline.costDetails),
          formatCost(proposed.costOption, proposed.costDetails),
          currentAvailable,
        ),
      ]
    case 'website':
      return [
        field(
          sectionId,
          'moreInfoUrl',
          'More information',
          baseline.moreInfoUrl,
          proposed.moreInfoUrl,
          currentAvailable,
        ),
        field(
          sectionId,
          'websites',
          'Website contacts',
          formatContacts(
            baseline.contacts.filter((contact) => contact.type === 'website'),
          ),
          formatContacts(
            proposed.contacts.filter((contact) => contact.type === 'website'),
          ),
          currentAvailable,
        ),
      ]
    case 'other':
      return [
        field(
          sectionId,
          'eligibility',
          'Who can use this resource',
          baseline.eligibility,
          proposed.eligibility,
          currentAvailable,
        ),
      ]
    default: {
      const exhaustive: never = sectionId
      return exhaustive
    }
  }
}

function field(
  sectionId: UpdateSectionId,
  fieldKey: string,
  label: string,
  currentRaw: string,
  proposedRaw: string,
  currentAvailable: boolean,
): ResourceUpdateComparisonField {
  const proposed = displayValue(proposedRaw)
  const current = currentAvailable ? displayValue(currentRaw) : null
  const changed = !currentAvailable || current !== proposed
  return {
    id: `${sectionId}:${fieldKey}`,
    label,
    current,
    proposed,
    currentAvailable,
    changed,
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
