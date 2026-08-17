/**
 * Logical submission model for the public Submit Resource experience.
 * Transport / API concerns live outside this type surface (later milestones).
 */

export type ContributionType =
  | 'existing_resource'
  | 'community_asset'
  | 'event'

export type ContributionStatus = 'incomplete' | 'complete'

export type PreferredContactMethod = 'email' | 'phone' | 'either'

export type SubmissionPhase = 'editing' | 'success'

export type AccessMode = 'physical' | 'online' | 'both'

export type CostOption =
  | 'free'
  | 'paid'
  | 'sliding_scale'
  | 'donation'
  | 'not_sure'
  | 'other'

export type RelationshipOption =
  | 'represent'
  | 'volunteer'
  | 'user'
  | 'someone_told_me'
  | 'public_info'
  | 'other'

export type ResourceContactType = 'phone' | 'email' | 'website' | 'other'

export type HoursAvailability =
  | 'structured'
  | 'varies'
  | 'contact_for_hours'

export interface DayHours {
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number
  isClosed: boolean
  opensAt: string
  closesAt: string
  byAppointment: boolean
}

export interface ResourceContactMethod {
  id: string
  type: ResourceContactType
  value: string
  label: string
}

/** One physical site for an Existing Resource contribution (frontend-only). */
export interface ExistingResourceLocation {
  id: string
  locationName: string
  streetAddress: string
  unit: string
  city: string
  province: string
  postalCode: string
  /**
   * MapTiler-verified coordinates for this address fingerprint.
   * Cleared when address fields change; required in the submission payload
   * for physical locations.
   */
  lat: number | null
  lng: number | null
}

/** @deprecated Prefer ExistingResourceLocation — kept for draft migration typing. */
export type ResourceLocationFields = Omit<ExistingResourceLocation, 'id'>

/** Frontend-only Existing Resource editor model (not an API payload). */
export interface ExistingResourceData {
  kind: 'existing_resource'
  name: string
  description: string
  imageUrl: string | null
  categoryIds: number[]
  /** UI “additional details / help people find this” — backed by tags later. */
  filterIds: number[]
  accessMode: AccessMode | null
  /** Physical sites; kept when switching to Online-only so data is not destroyed. */
  locations: ExistingResourceLocation[]
  onlineUrl: string
  /** Resource-wide hours (not per-location) for this milestone. */
  hoursAvailability: HoursAvailability
  hours: DayHours[]
  contacts: ResourceContactMethod[]
  costOption: CostOption | null
  costDetails: string
  accessibilityNotes: string
  eligibility: string
  moreInfoUrl: string
  generalNotes: string
  relationship: RelationshipOption | null
  relationshipOther: string
}

export interface PlaceholderContributionData {
  kind: 'placeholder'
}

export type AvailabilityOption =
  | 'weekdays'
  | 'evenings'
  | 'weekends'
  | 'flexible'

export type PersonalProviderOption = 'yes' | 'on_behalf'

/** Frontend-only My Skills or Services editor model (not an API payload). */
export interface SkillsServicesData {
  kind: 'community_asset'
  title: string
  description: string
  /** Free-text audience; no hardcoded taxonomy. */
  whoBenefits: string
  availability: AvailabilityOption[]
  availabilityNotes: string
  /** Free-text languages (no backend language lookup yet). */
  languages: string[]
  aboutYou: string
  inspiration: string
  providedPersonally: PersonalProviderOption | null
  onBehalfOfNotes: string
}

export type ContributionData =
  | ExistingResourceData
  | SkillsServicesData
  | EventContributionData
  | PlaceholderContributionData

export type EventScheduleKind = 'one_time' | 'recurring'

export type EventFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'other'

/** Weekdays for weekly / every-two-weeks recurrence (Mon–Sun). */
export type EventWeekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type RecurrenceEndKind =
  | 'none'
  | 'end_date'
  /** @deprecated Kept for older drafts; UI uses Never / On date. */
  | 'occurrences'
  /** @deprecated Kept for older drafts; UI uses Never / On date. */
  | 'not_sure'

export type RegistrationMode =
  | 'required'
  | 'not_required'
  | 'not_sure'

export type EventCostOption =
  | 'free'
  | 'free_registration'
  | 'paid'
  | 'donation'
  | 'sliding_scale'
  | 'not_sure'
  | 'other'

export type EventRelationshipOption =
  | 'organizing'
  | 'represent_host'
  | 'volunteer'
  | 'public_info'
  | 'someone_told_me'
  | 'other'

/** Frontend-only Event editor model (not an API payload). */
export interface EventContributionData {
  kind: 'event'
  name: string
  description: string
  scheduleKind: EventScheduleKind | null
  /** One-time start date, or recurring first occurrence (YYYY-MM-DD). */
  startDate: string
  startTime: string
  /** One-time end date (optional). */
  endDate: string
  endTime: string
  frequency: EventFrequency | null
  frequencyOther: string
  /** Selected weekdays when frequency is weekly or biweekly. */
  recurrenceWeekdays: EventWeekday[]
  recurrenceEndKind: RecurrenceEndKind | null
  recurrenceEndDate: string
  /** Whole-number string when recurrence ends after N occurrences (legacy drafts). */
  recurrenceOccurrences: string
  accessMode: AccessMode | null
  locations: ExistingResourceLocation[]
  onlineUrl: string
  categoryIds: number[]
  filterIds: number[]
  registrationMode: RegistrationMode | null
  contacts: ResourceContactMethod[]
  costOption: EventCostOption | null
  costDetails: string
  accessibilityNotes: string
  eligibility: string
  moreInfoUrl: string
  generalNotes: string
  relationship: EventRelationshipOption | null
  relationshipOther: string
}

export interface Contribution {
  id: string
  type: ContributionType
  status: ContributionStatus
  title: string
  summary: string
  /** Human-readable chips for the summary card (category names, access labels). */
  highlights: string[]
  data: ContributionData
}

export interface ContributorInfo {
  name: string
  email: string
  phone: string
  /** Null until the contributor chooses a preferred method. */
  preferredContactMethod: PreferredContactMethod | null
  /**
   * How the contributor is connected to an existing resource they are
   * submitting or updating. Required when the draft includes an existing
   * resource; mapped into submission_message. Not used for events/skills.
   */
  relationship: RelationshipOption | null
  relationshipOther: string
}

export interface EditorSession {
  mode: 'create' | 'edit'
  type: ContributionType
  contributionId: string | null
}

export interface SubmissionDraftUi {
  editor: EditorSession | null
  showTypePicker: boolean
  /** Contributor information editor sheet. */
  showContributorEditor: boolean
  /** Read-only review & submit sheet. */
  showReview: boolean
  phase: SubmissionPhase
}

export interface SubmissionDraftMeta {
  updatedAt: string
  version: number
}

export interface SubmissionDraft {
  id: string
  contributions: Contribution[]
  contributor: ContributorInfo
  ui: SubmissionDraftUi
  meta: SubmissionDraftMeta
}

/** Payload passed from an editor into the draft provider on save. */
export interface SavedContributionPayload {
  title: string
  summary: string
  highlights: string[]
  status: ContributionStatus
  data: ContributionData
}

/**
 * Serializable, human-readable review/PDF/email-friendly summary.
 * Derived from draft state — not persisted separately.
 */
export interface HumanReadableContributionSummary {
  id: string
  typeLabel: string
  title: string
  lines: string[]
}

export interface HumanReadableContributorSummary {
  name: string
  email: string
  phone: string
  preferredContactLabel: string
}

export interface HumanReadableSubmissionSummary {
  contributor: HumanReadableContributorSummary
  contributions: HumanReadableContributionSummary[]
}

/**
 * Reserved for post-submit success (Milestone 6+).
 * Do not invent values — leave unset until the backend returns them.
 */
export interface FutureSuccessMetadata {
  submittedAt?: string
  submissionReference?: string
  downloadableSummaryAvailable?: boolean
  emailSummaryAvailable?: boolean
}

/**
 * Bump when the persisted draft shape breaks compatibility.
 * v4: Existing Resource `location` → `locations[]` (multi-site).
 * v5: Adds My Skills or Services (`community_asset`) contribution data.
 * v6: Adds Event contribution data.
 * v7: Contributor preferred-method nullable; UI flags for contributor/review sheets.
 * Prior keys are ignored; incomplete/old drafts are not auto-migrated.
 */
export const SUBMISSION_DRAFT_SCHEMA_VERSION = 7

export const RESOURCE_NAME_MAX_LENGTH = 255
export const RESOURCE_COST_MAX_LENGTH = 255
export const SKILLS_TITLE_MAX_LENGTH = 255
export const EVENT_NAME_MAX_LENGTH = 255
export const CONTRIBUTOR_NAME_MAX_LENGTH = 255
