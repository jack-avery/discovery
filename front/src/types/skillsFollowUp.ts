import type { PaginationMeta } from '@/types/resource'

/**
 * Backend SkillsFollowUp.STATUSES — GET/PATCH /skills-follow-ups.
 */
export type SkillsFollowUpStatus =
  | 'accepted'
  | 'contacted'
  | 'in_discussion'
  | 'converted'
  | 'closed'

/**
 * Statuses staff may select in the lightweight follow-up control for
 * immediate PATCH. `converted` is offered separately and uses a staged
 * resource-link workflow (requires `converted_resource_id`).
 */
export type EditableSkillsFollowUpStatus = Exclude<
  SkillsFollowUpStatus,
  'converted'
>

/** List item from GET /skills-follow-ups → to_dict_summary(). */
export interface SkillsFollowUpSummaryDto {
  follow_up_id: number
  submission_id: number
  status: SkillsFollowUpStatus | string
  submitter_name: string | null
  skill_name: string | null
  accepted_at: string | null
}

/** Nested submission block from GET /skills-follow-ups/:id → to_dict_full(). */
export interface SkillsFollowUpSubmissionDetailDto {
  submitter_name: string | null
  submitter_email: string | null
  submitter_phone: string | null
  submission_message: string | null
  skill_description: string | null
  eligibility_or_availability: string | null
  general_notes: string | null
}

/** Detail from GET /skills-follow-ups/:id → to_dict_full(). */
export interface SkillsFollowUpDetailDto {
  follow_up_id: number
  submission_id: number
  status: SkillsFollowUpStatus | string
  internal_notes: string | null
  accepted_at: string | null
  accepted_by: string | null
  updated_at: string | null
  updated_by: string | null
  converted_resource_id: number | null
  submission: SkillsFollowUpSubmissionDetailDto | null
}

/**
 * Raw list envelope from GET /skills-follow-ups
 * (`paginate()` → `{ items, meta }`).
 */
export interface SkillsFollowUpListDto {
  items: SkillsFollowUpSummaryDto[]
  meta: PaginationMeta
}

/** Client sort — backend hardcodes accepted_at DESC; oldest uses reverse pagination. */
export type SkillsFollowUpSort = 'newest' | 'oldest'

export interface ListSkillsFollowUpsQuery {
  status?: SkillsFollowUpStatus
  page?: number
  /** Backend query param name is `limit`. */
  limit?: number
  sort?: SkillsFollowUpSort
}
