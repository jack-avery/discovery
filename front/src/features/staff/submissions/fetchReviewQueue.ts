import type { SubmissionSummaryDto } from '@/types/moderationSubmission'
import { isEventProposedVersion } from '@/features/staff/submissions/mapEventVersionForPresentation'
import {
  fetchSubmissionById,
  fetchSubmissions,
} from '@/services/staffSubmissionService'
import type { BackendSubmissionType } from '@/types/submissionApi'

/**
 * Contribution kinds shown in the Review Submissions queue filter.
 * Empty selection (`[]`) means All — same as selecting every kind.
 */
export type ReviewContributionKind =
  | 'existing_resource'
  | 'event'
  | 'skill'
  | 'resource_update'

/** @deprecated Prefer {@link ReviewContributionKind}[]; empty array = all. */
export type ReviewContributionFilter =
  | 'all'
  | ReviewContributionKind

export type ReviewQueueSort = 'newest' | 'oldest'

/** Queue row with contribution kind for filters and labels. */
export interface ReviewQueueItem extends SubmissionSummaryDto {
  contributionKind: ReviewContributionKind
}

export interface FetchReviewQueueOptions {
  /**
   * Selected contribution kinds. Empty array = all kinds
   * (same behaviour as the former "All" single-select).
   */
  filters?: ReviewContributionKind[]
  /** @deprecated Use `filters` (multi-select). */
  filter?: ReviewContributionFilter
  sort?: ReviewQueueSort
  signal?: AbortSignal
}

export const REVIEW_CONTRIBUTION_KIND_OPTIONS: {
  value: ReviewContributionKind
  label: string
}[] = [
  { value: 'existing_resource', label: 'New Organization / Service' },
  { value: 'event', label: 'New Event' },
  { value: 'skill', label: 'New Skills & Services' },
  { value: 'resource_update', label: 'Resource Update' },
]

/**
 * Load the pending review queue with contribution-type filter and sort.
 *
 * Backend list filters by `submission_type`. Event vs organization both use
 * `new_resource`, so those filters classify client-side via detail payloads.
 */
export async function fetchReviewQueue(
  options: FetchReviewQueueOptions = {},
): Promise<ReviewQueueItem[]> {
  const selectedKinds = resolveSelectedKinds(options)
  const sort = options.sort ?? 'newest'
  const { signal } = options

  const summaries = await fetchPendingSummaries(selectedKinds, signal)
  const enriched = await enrichWithContributionKind(summaries, signal)

  const filtered =
    selectedKinds.length === 0
      ? enriched
      : enriched.filter((item) => selectedKinds.includes(item.contributionKind))

  return sortQueueItems(filtered, sort)
}

function resolveSelectedKinds(
  options: FetchReviewQueueOptions,
): ReviewContributionKind[] {
  if (options.filters !== undefined) {
    return options.filters
  }

  // Legacy single-select bridge.
  if (!options.filter || options.filter === 'all') return []
  return [options.filter]
}

async function fetchPendingSummaries(
  selectedKinds: ReviewContributionKind[],
  signal?: AbortSignal,
): Promise<SubmissionSummaryDto[]> {
  const kinds =
    selectedKinds.length === 0
      ? REVIEW_CONTRIBUTION_KIND_OPTIONS.map((option) => option.value)
      : selectedKinds

  const backendTypes = new Set<BackendSubmissionType>()
  for (const kind of kinds) {
    if (kind === 'existing_resource' || kind === 'event') {
      backendTypes.add('new_resource')
    } else if (kind === 'skill') {
      backendTypes.add('community_asset')
    } else if (kind === 'resource_update') {
      backendTypes.add('update_resource')
    }
  }

  const results = await Promise.all(
    [...backendTypes].map((submission_type) =>
      fetchSubmissions(
        {
          status: 'pending_review',
          submission_type,
          limit: 100,
        },
        { signal },
      ),
    ),
  )

  return results.flatMap((result) => result.items)
}

async function enrichWithContributionKind(
  summaries: SubmissionSummaryDto[],
  signal?: AbortSignal,
): Promise<ReviewQueueItem[]> {
  return Promise.all(
    summaries.map(async (item) => {
      if (item.submission_type === 'update_resource') {
        return { ...item, contributionKind: 'resource_update' as const }
      }

      if (item.submission_type === 'community_asset') {
        return { ...item, contributionKind: 'skill' as const }
      }

      try {
        const detail = await fetchSubmissionById(item.submission_id, { signal })
        const kind: ReviewContributionKind =
          detail.proposed_version &&
          isEventProposedVersion(detail.proposed_version)
            ? 'event'
            : 'existing_resource'
        return { ...item, contributionKind: kind }
      } catch {
        // If detail fails, keep the row and treat as existing resource.
        return { ...item, contributionKind: 'existing_resource' as const }
      }
    }),
  )
}

function sortQueueItems(
  items: ReviewQueueItem[],
  sort: ReviewQueueSort,
): ReviewQueueItem[] {
  return [...items].sort((a, b) => {
    const left = a.created_at ?? ''
    const right = b.created_at ?? ''
    return sort === 'newest'
      ? right.localeCompare(left)
      : left.localeCompare(right)
  })
}

export function contributionKindLabel(kind: ReviewContributionKind): string {
  switch (kind) {
    case 'existing_resource':
      return 'New Organization / Service'
    case 'event':
      return 'New Event'
    case 'skill':
      return 'New Skills & Services'
    case 'resource_update':
      return 'Resource Update'
    default:
      return kind
  }
}

export function nextQueueSelection(
  items: readonly { submission_id: number }[],
  currentId: number | null,
): number | null {
  if (items.length === 0) return null
  if (currentId == null) return items[0]?.submission_id ?? null

  const index = items.findIndex((item) => item.submission_id === currentId)
  if (index < 0) return items[0]?.submission_id ?? null

  return (
    items[index + 1]?.submission_id ??
    items[index - 1]?.submission_id ??
    null
  )
}
