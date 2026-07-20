/**
 * Public POST /submissions transport types.
 * Nested field names match the public API (not staff/DB column names).
 */

export type BackendSubmissionType =
  | 'new_resource'
  | 'update_resource'
  | 'community_asset'

/** Temporary backend resource_type values — mapper-only, never shown in UI. */
export type BackendResourceType =
  | 'Organization'
  | 'Program'
  | 'Service'
  | 'Volunteer Skill'
  | 'Volunteer Service'
  | 'Program Idea'
  | 'Informal Support'

export interface PublicSubmissionLocationDto {
  address: string
  city?: string
  province?: string
  postal_code?: string
  lat?: number
  lng?: number
}

export interface PublicSubmissionContactDto {
  contact_type: string
  value: string
  label?: string
}

export interface PublicSubmissionHourDto {
  day_of_week: string
  open_time?: string
  close_time?: string
  is_closed?: boolean
}

export interface CreateSubmissionRequestDto {
  submission_type: BackendSubmissionType
  resource_id?: number
  name: string
  resource_type?: BackendResourceType | string
  description?: string
  eligibility?: string
  cost_description?: string
  accessibility_notes?: string
  general_notes?: string
  image_url?: string
  category_ids?: number[]
  tag_ids?: number[]
  submitter_name?: string
  submitter_email?: string
  submitter_phone?: string
  submission_message?: string
  locations?: PublicSubmissionLocationDto[]
  contacts?: PublicSubmissionContactDto[]
  hours?: PublicSubmissionHourDto[]
}

export interface CreateSubmissionResponseDto {
  submission_id: number
  resource_id: number
  proposed_version_id: number
  /**
   * Not returned by the API yet.
   * TODO(update-resource): When staff submissions are auto-approved, the
   * backend should include moderation_status so the shared Update Resource
   * success UI can branch to published without client-side role checks.
   */
  moderation_status?: string
}
