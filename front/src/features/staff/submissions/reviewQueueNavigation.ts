import {
  REVIEW_CONTRIBUTION_KIND_OPTIONS,
  type ReviewContributionKind,
} from '@/features/staff/submissions/fetchReviewQueue'

export const REVIEW_SUBMISSIONS_PATH = '/staff/submissions'

/** New resource submissions (excludes Resource Updates). */
export const NEW_RESOURCE_SUBMISSION_FILTERS: ReviewContributionKind[] = [
  'existing_resource',
  'event',
  'skill',
]

export const RESOURCE_UPDATE_FILTERS: ReviewContributionKind[] = [
  'resource_update',
]

const VALID_KINDS = new Set<string>(
  REVIEW_CONTRIBUTION_KIND_OPTIONS.map((option) => option.value),
)

export function reviewSubmissionsUrl(
  filters: readonly ReviewContributionKind[],
): string {
  if (filters.length === 0) return REVIEW_SUBMISSIONS_PATH
  return `${REVIEW_SUBMISSIONS_PATH}?types=${filters.join(',')}`
}

export function parseReviewQueueFiltersFromSearchParams(
  searchParams: URLSearchParams,
): ReviewContributionKind[] | null {
  const raw = searchParams.get('types')
  if (raw == null || raw.trim() === '') return null

  const parsed = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => VALID_KINDS.has(value)) as ReviewContributionKind[]

  return parsed.length > 0 ? parsed : null
}
