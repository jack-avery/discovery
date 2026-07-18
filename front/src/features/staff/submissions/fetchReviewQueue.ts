import type { SubmissionSummaryDto } from '@/types/moderationSubmission'
import { isEventProposedVersion } from '@/features/staff/submissions/mapEventVersionForPresentation'
import {
  fetchSubmissionById,
  fetchSubmissions,
} from '@/services/staffSubmissionService'

export type ReviewContributionFilter =
  | 'all'
  | 'existing_resource'
  | 'event'
  | 'skill'

export type ReviewQueueSort = 'newest' | 'oldest'

export type ReviewContributionKind =
  | 'existing_resource'
  | 'event'
  | 'skill'

/** Queue row with contribution kind for filters and labels. */
export interface ReviewQueueItem extends SubmissionSummaryDto {
  contributionKind: ReviewContributionKind
}

export interface FetchReviewQueueOptions {
  filter?: ReviewContributionFilter
  sort?: ReviewQueueSort
  signal?: AbortSignal
}

/**
 * Load the pending review queue with contribution-type filter and sort.
 *
 * Backend list filters only by `submission_type` (`new_resource` | `community_asset`).
 * Event vs existing resource both use `new_resource`, so those filters classify
 * client-side via detail payloads (no backend contract change).
 */
export async function fetchReviewQueue(
  options: FetchReviewQueueOptions = {},
): Promise<ReviewQueueItem[]> {
  const filter = options.filter ?? 'all'
  const sort = options.sort ?? 'newest'
  const { signal } = options

  const summaries = await fetchPendingSummaries(filter, signal)
  const enriched = await enrichWithContributionKind(summaries, signal)

  const filtered =
    filter === 'event'
      ? enriched.filter((item) => item.contributionKind === 'event')
      : filter === 'existing_resource'
        ? enriched.filter((item) => item.contributionKind === 'existing_resource')
        : enriched

  return sortQueueItems(filtered, sort)
}

async function fetchPendingSummaries(
  filter: ReviewContributionFilter,
  signal?: AbortSignal,
): Promise<SubmissionSummaryDto[]> {
  if (filter === 'skill') {
    const result = await fetchSubmissions(
      {
        status: 'pending_review',
        submission_type: 'community_asset',
        limit: 100,
      },
      { signal },
    )
    return result.items
  }

  if (filter === 'existing_resource' || filter === 'event') {
    const result = await fetchSubmissions(
      {
        status: 'pending_review',
        submission_type: 'new_resource',
        limit: 100,
      },
      { signal },
    )
    return result.items
  }

  const [resources, skills] = await Promise.all([
    fetchSubmissions(
      {
        status: 'pending_review',
        submission_type: 'new_resource',
        limit: 100,
      },
      { signal },
    ),
    fetchSubmissions(
      {
        status: 'pending_review',
        submission_type: 'community_asset',
        limit: 100,
      },
      { signal },
    ),
  ])

  return [...resources.items, ...skills.items]
}

async function enrichWithContributionKind(
  summaries: SubmissionSummaryDto[],
  signal?: AbortSignal,
): Promise<ReviewQueueItem[]> {
  return Promise.all(
    summaries.map(async (item) => {
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
      return 'Existing Resource'
    case 'event':
      return 'Event'
    case 'skill':
      return 'Skills / Services'
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
