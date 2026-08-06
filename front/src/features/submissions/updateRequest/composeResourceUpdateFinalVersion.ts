import type { ExistingResourceData } from '@/types/submission'
import { normalizeExistingResourceData } from '@/features/submissions/existingResource/emptyState'
import type {
  ResourceUpdateComparison,
  ResourceUpdateComparisonField,
} from './buildResourceUpdateComparison'

export type ComposedFieldSource = 'proposed' | 'current' | 'edited'

export interface ComposedUpdateFieldValue {
  fieldId: string
  label: string
  value: string
  source: ComposedFieldSource
}

/**
 * Local final-version composition for resource update moderation.
 * Not sent to the backend until review supports an approved_version payload.
 */
export interface ComposedResourceUpdateVersion {
  /** Field-level final display values. */
  fields: Record<string, ComposedUpdateFieldValue>
  /**
   * Best-effort structured model: starts from proposed, applies rejected
   * fields from baseline, and simple string edits. Complex collection edits
   * remain in {@link fields} only.
   */
  data: ExistingResourceData
  /** True when outcome differs from approving the original proposal as-is. */
  differsFromProposed: boolean
}

const EMPTY_DISPLAY = 'Not provided'

const SIMPLE_STRING_FIELDS = new Set([
  'about:name',
  'about:description',
  'address:onlineUrl',
  'accessibility:accessibilityNotes',
  'website:moreInfoUrl',
  'other:eligibility',
])

export function resolveFieldOutcome(
  field: ResourceUpdateComparisonField,
  accepted: Record<string, boolean>,
  edits: Record<string, string>,
): ComposedUpdateFieldValue {
  const editedRaw = edits[field.id]
  const isEdited =
    editedRaw != null && normalizeDisplay(editedRaw) !== field.proposed
  const useProposed = accepted[field.id] !== false

  if (!useProposed && field.currentAvailable && field.current != null) {
    return {
      fieldId: field.id,
      label: field.label,
      value: field.current,
      source: 'current',
    }
  }

  if (isEdited) {
    return {
      fieldId: field.id,
      label: field.label,
      value: normalizeDisplay(editedRaw!),
      source: 'edited',
    }
  }

  return {
    fieldId: field.id,
    label: field.label,
    value: field.proposed,
    source: 'proposed',
  }
}

export function composeResourceUpdateFinalVersion(
  baseline: ExistingResourceData | null,
  proposed: ExistingResourceData,
  comparison: ResourceUpdateComparison,
  accepted: Record<string, boolean>,
  edits: Record<string, string>,
): ComposedResourceUpdateVersion {
  const data = structuredClone(proposed)
  const fields: Record<string, ComposedUpdateFieldValue> = {}
  let differsFromProposed = false

  for (const section of comparison.sections) {
    for (const field of section.fields) {
      const outcome = resolveFieldOutcome(field, accepted, edits)
      fields[field.id] = outcome

      if (outcome.source === 'current') {
        differsFromProposed = true
        if (baseline) {
          applyFieldFromSource(data, baseline, field.id)
        }
        continue
      }

      if (outcome.source === 'edited') {
        differsFromProposed = true
        if (SIMPLE_STRING_FIELDS.has(field.id)) {
          applySimpleStringEdit(data, field.id, outcome.value)
        }
      }
    }
  }

  return {
    fields,
    data: normalizeExistingResourceData(data),
    differsFromProposed,
  }
}

function normalizeDisplay(value: string): string {
  const trimmed = value.trim()
  return trimmed || EMPTY_DISPLAY
}

function displayToStored(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === EMPTY_DISPLAY) return ''
  return trimmed
}

function applySimpleStringEdit(
  target: ExistingResourceData,
  fieldId: string,
  displayValue: string,
): void {
  const stored = displayToStored(displayValue)
  switch (fieldId) {
    case 'about:name':
      target.name = stored
      break
    case 'about:description':
      target.description = stored
      break
    case 'address:onlineUrl':
      target.onlineUrl = stored
      break
    case 'accessibility:accessibilityNotes':
      target.accessibilityNotes = stored
      break
    case 'website:moreInfoUrl':
      target.moreInfoUrl = stored
      break
    case 'other:eligibility':
      target.eligibility = stored
      break
    default:
      break
  }
}

function applyFieldFromSource(
  target: ExistingResourceData,
  source: ExistingResourceData,
  fieldId: string,
): void {
  switch (fieldId) {
    case 'about:name':
      target.name = source.name
      break
    case 'about:description':
      target.description = source.description
      break
    case 'hours:hours':
      target.hoursAvailability = source.hoursAvailability
      target.hours = structuredClone(source.hours)
      break
    case 'contact:contacts': {
      const websites = target.contacts.filter((c) => c.type === 'website')
      const fromSource = source.contacts.filter((c) => c.type !== 'website')
      target.contacts = [...structuredClone(fromSource), ...websites]
      break
    }
    case 'address:accessMode':
      target.accessMode = source.accessMode
      break
    case 'address:locations':
      target.locations = structuredClone(source.locations)
      break
    case 'address:onlineUrl':
      target.onlineUrl = source.onlineUrl
      break
    case 'categories:categories':
      target.categoryIds = [...source.categoryIds]
      break
    case 'categories:filters':
      target.filterIds = [...source.filterIds]
      break
    case 'accessibility:accessibilityNotes':
      target.accessibilityNotes = source.accessibilityNotes
      break
    case 'cost:cost':
      target.costOption = source.costOption
      target.costDetails = source.costDetails
      break
    case 'website:moreInfoUrl':
      target.moreInfoUrl = source.moreInfoUrl
      break
    case 'website:websites': {
      const nonWebsites = target.contacts.filter((c) => c.type !== 'website')
      const fromSource = source.contacts.filter((c) => c.type === 'website')
      target.contacts = [...nonWebsites, ...structuredClone(fromSource)]
      break
    }
    case 'other:eligibility':
      target.eligibility = source.eligibility
      break
    default:
      break
  }
}
