import { api, type QueryParamValue } from '@/services/api'
import type {
  ListSubmissionsQuery,
  ReviewSubmissionRequestDto,
  ReviewSubmissionResultDto,
  SubmissionDetailDto,
  SubmissionListDto,
} from '@/types/moderationSubmission'
import type { BackendSubmissionType } from '@/types/submissionApi'
import { EMPTY_PAGINATION } from '@/services/resourceService'

/**
 * Submission types reviewed on the Staff "Review Submissions" queue.
 * Update requests are handled on a separate staff route.
 */
export const REVIEW_SUBMISSION_TYPES: readonly BackendSubmissionType[] = [
  'new_resource',
  'community_asset',
] as const

export function isReviewSubmissionType(
  type: string,
): type is BackendSubmissionType {
  return (REVIEW_SUBMISSION_TYPES as readonly string[]).includes(type)
}

export interface FetchSubmissionsOptions {
  signal?: AbortSignal
}

/**
 * GET /submissions — moderator+ queue (defaults to pending_review).
 */
export async function fetchSubmissions(
  query: ListSubmissionsQuery = {},
  options?: FetchSubmissionsOptions,
): Promise<SubmissionListDto> {
  const params: Record<string, QueryParamValue> = {
    status: query.status ?? 'pending_review',
    page: query.page ?? 1,
    limit: query.limit ?? 100,
  }
  if (query.submission_type) {
    params.submission_type = query.submission_type
  }

  return api.get<SubmissionListDto>('/submissions', {
    params,
    signal: options?.signal,
  })
}

export async function fetchSubmissionById(
  submissionId: number,
  options?: FetchSubmissionsOptions,
): Promise<SubmissionDetailDto> {
  return api.get<SubmissionDetailDto>(`/submissions/${submissionId}`, {
    signal: options?.signal,
  })
}

/**
 * POST /submissions/:id/review — approve or reject.
 */
export async function reviewSubmission(
  submissionId: number,
  payload: ReviewSubmissionRequestDto,
  options?: FetchSubmissionsOptions,
): Promise<ReviewSubmissionResultDto> {
  return api.post<ReviewSubmissionResultDto>(
    `/submissions/${submissionId}/review`,
    payload,
    { signal: options?.signal },
  )
}

export const EMPTY_SUBMISSION_LIST: SubmissionListDto = {
  items: [],
  meta: EMPTY_PAGINATION,
}

export function submissionTypeLabel(type: string): string {
  switch (type) {
    case 'new_resource':
      return 'New resource'
    case 'community_asset':
      return 'Community asset'
    case 'update_resource':
      return 'Update request'
    default:
      return type.replace(/_/g, ' ')
  }
}

export function formatSubmissionDate(
  value: string | null | undefined,
  options?: { includeTime?: boolean },
): string {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  if (options?.includeTime) {
    return date.toLocaleString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function moderationStatusLabel(status: string): string {
  switch (status) {
    case 'pending_review':
      return 'Pending'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    default:
      return status.replace(/_/g, ' ')
  }
}
