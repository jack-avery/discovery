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

/** Placeholder payload until type-specific editors land in later milestones. */
export type ContributionData = Record<string, never>

export interface Contribution {
  id: string
  type: ContributionType
  status: ContributionStatus
  /** Human-facing card title (editors supply a real name later). */
  title: string
  /** Short human-readable summary for the saved card (optional until editors fill it). */
  summary: string
  data: ContributionData
}

export interface ContributorInfo {
  name: string
  email: string
  phone: string
  preferredContactMethod: PreferredContactMethod
}

/**
 * Active editor session — contributions are not added to the draft until save.
 * create: no contributionId yet
 * edit: opens an existing saved contribution
 */
export interface EditorSession {
  mode: 'create' | 'edit'
  type: ContributionType
  contributionId: string | null
}

export interface SubmissionDraftUi {
  /** Open contribution editor sheet; null when closed. */
  editor: EditorSession | null
  /**
   * When true and contributions already exist, show the type picker
   * for “Add another contribution”. When the draft is empty, the picker
   * is always visible regardless of this flag.
   */
  showTypePicker: boolean
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
  consent: boolean
  ui: SubmissionDraftUi
  meta: SubmissionDraftMeta
}

/** Bump when the persisted draft shape breaks compatibility. */
export const SUBMISSION_DRAFT_SCHEMA_VERSION = 2
