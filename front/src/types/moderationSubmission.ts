/**
 * Staff moderation DTOs for GET/POST /submissions (moderator+).
 * Mirrors backend serializers in Submission.to_dict_summary / to_dict_full.
 */

import type { BackendSubmissionType } from '@/types/submissionApi'
import type { PaginationMeta, ResourceVersionDto } from '@/types/resource'

export type ModerationStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | string

export interface SubmissionSummaryDto {
  submission_id: number
  submission_type: BackendSubmissionType
  moderation_status: ModerationStatus
  submitter_name: string | null
  proposed_resource_name: string | null
  created_at: string | null
}

/**
 * Backend list payload uses `items` + `meta` (not `resources` / `pagination`).
 */
export interface SubmissionListDto {
  items: SubmissionSummaryDto[]
  meta: PaginationMeta
}

export interface SubmissionReviewDto {
  review_id: number
  moderation_status: string
  review_comment: string | null
  reviewed_by: string | null
  reviewed_at: string | null
}

/**
 * Live approved resource attached to update_resource submission detail.
 * Null when the published baseline could not be loaded (or for non-update types).
 */
export interface CurrentApprovedResourceDto {
  resource_id: number
  slug: string
  version: ResourceVersionDto
}

export interface SubmissionDetailDto {
  submission_id: number
  submission_type: BackendSubmissionType
  moderation_status: ModerationStatus
  submitter_name: string | null
  submitter_email: string | null
  submitter_phone: string | null
  submission_message: string | null
  created_at: string | null
  proposed_version: ResourceVersionDto | null
  /**
   * Present on update_resource detail responses.
   * Null when the live approved version is unavailable.
   */
  current_approved_resource?: CurrentApprovedResourceDto | null
  review_history: SubmissionReviewDto[]
}

export type ReviewDecision = 'approved' | 'rejected' | 'accepted_for_follow_up'

export interface ReviewSubmissionRequestDto {
  decision: ReviewDecision
  /** Optional rejection/approval notes — backend also accepts `review_comment`. */
  notes?: string
}

export interface ReviewSubmissionResultDto {
  submission_id: number
  decision: ReviewDecision
  resource_id: number
  proposed_version_id: number
}

export interface ListSubmissionsQuery {
  status?: string
  submission_type?: BackendSubmissionType
  page?: number
  /** Backend query param is `limit`, not `per_page`. */
  limit?: number
}
