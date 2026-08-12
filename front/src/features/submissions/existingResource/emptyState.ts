import type {
  ContributionData,
  DayHours,
  ExistingResourceData,
  ExistingResourceLocation,
  ResourceContactMethod,
} from '@/types/submission'
import { DEPLOYMENT_CONFIG } from '@/config/deploymentConfig'

function createLocalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

/** Neutral aliases derived from deployment geography config. */
export const DEFAULT_CITY = DEPLOYMENT_CONFIG.geography.defaultCity
export const DEFAULT_PROVINCE = DEPLOYMENT_CONFIG.geography.defaultProvince

export function createDefaultHours(): DayHours[] {
  return WEEKDAY_LABELS.map((_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: dayOfWeek === 0,
    opensAt: '09:00',
    closesAt: '17:00',
    byAppointment: false,
  }))
}

export function createContactMethod(
  partial?: Partial<ResourceContactMethod>,
): ResourceContactMethod {
  return {
    id: createLocalId(),
    type: 'phone',
    value: '',
    label: '',
    ...partial,
  }
}

export function createEmptyLocation(
  partial?: Partial<ExistingResourceLocation>,
): ExistingResourceLocation {
  return {
    locationName: '',
    streetAddress: '',
    unit: '',
    city: DEFAULT_CITY,
    province: DEFAULT_PROVINCE,
    postalCode: '',
    ...partial,
    id:
      partial?.id && typeof partial.id === 'string'
        ? partial.id
        : createLocalId(),
    lat: normalizeCoordinate(partial?.lat),
    lng: normalizeCoordinate(partial?.lng),
  }
}

function normalizeCoordinate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** True when the location has only defaults / blanks (safe to discard without confirm). */
export function isLocationBlank(location: ExistingResourceLocation): boolean {
  return (
    !location.locationName.trim() &&
    !location.streetAddress.trim() &&
    !location.unit.trim() &&
    !location.postalCode.trim() &&
    location.city.trim() === DEFAULT_CITY &&
    location.province.trim() === DEFAULT_PROVINCE
  )
}

export function getLocationHeading(
  location: ExistingResourceLocation,
  index: number,
): string {
  const name = location.locationName.trim()
  return name || `Location ${index + 1}`
}

export function createEmptyExistingResourceData(): ExistingResourceData {
  return {
    kind: 'existing_resource',
    name: '',
    description: '',
    categoryIds: [],
    filterIds: [],
    accessMode: null,
    locations: [createEmptyLocation()],
    onlineUrl: '',
    hoursAvailability: 'contact_for_hours',
    hours: createDefaultHours(),
    contacts: [createContactMethod()],
    costOption: null,
    costDetails: '',
    accessibilityNotes: '',
    eligibility: '',
    moreInfoUrl: '',
    generalNotes: '',
    relationship: null,
    relationshipOther: '',
  }
}

export function createPlaceholderData(): ContributionData {
  return { kind: 'placeholder' }
}

export function isExistingResourceData(
  data: ContributionData | undefined,
): data is ExistingResourceData {
  return data?.kind === 'existing_resource'
}

/**
 * Normalize contribution data into the multi-location shape.
 * Migrates legacy single `location` objects when present so editors do not crash.
 */
export function normalizeExistingResourceData(
  data: ExistingResourceData | Record<string, unknown>,
): ExistingResourceData {
  const base = createEmptyExistingResourceData()
  const raw = data as ExistingResourceData & {
    location?: Omit<ExistingResourceLocation, 'id'> & { id?: string }
  }

  let locations: ExistingResourceLocation[] = []
  if (Array.isArray(raw.locations)) {
    // Preserve an intentional empty array (e.g. structured moderation clear).
    // Only synthesize a placeholder when locations is missing/non-array.
    locations =
      raw.locations.length > 0
        ? raw.locations.map((loc) =>
            createEmptyLocation({
              ...loc,
              id: typeof loc.id === 'string' && loc.id ? loc.id : undefined,
            }),
          )
        : []
  } else if (raw.location && typeof raw.location === 'object') {
    locations = [
      createEmptyLocation({
        locationName: raw.location.locationName ?? '',
        streetAddress: raw.location.streetAddress ?? '',
        unit: raw.location.unit ?? '',
        city: raw.location.city ?? DEFAULT_CITY,
        province: raw.location.province ?? DEFAULT_PROVINCE,
        postalCode: raw.location.postalCode ?? '',
        id: raw.location.id,
      }),
    ]
  } else {
    locations = [createEmptyLocation()]
  }

  const {
    location: _legacyLocation,
    locations: _ignoredLocations,
    ...rest
  } = raw as ExistingResourceData & {
    location?: unknown
  }

  return {
    ...base,
    ...rest,
    kind: 'existing_resource',
    locations,
    categoryIds: Array.isArray(raw.categoryIds) ? raw.categoryIds : [],
    filterIds: Array.isArray(raw.filterIds) ? raw.filterIds : [],
    contacts: Array.isArray(raw.contacts)
      ? raw.contacts
      : [createContactMethod()],
    hours:
      Array.isArray(raw.hours) && raw.hours.length > 0
        ? raw.hours
        : createDefaultHours(),
  }
}
