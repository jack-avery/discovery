import { api, ApiError } from '@/services/api'
import type { Contribution, SubmissionDraft } from '@/types/submission'
import type {
  CreateSubmissionRequestDto,
  CreateSubmissionResponseDto,
} from '@/types/submissionApi'
import { MAX_CONTRIBUTIONS_PER_SUBMISSION } from '@/features/submissions/constants/contributionLimits'
import { isContributorComplete } from '@/features/submissions/contributor/validation'
import { mapContributionToRequest } from '@/features/submissions/mappers/mapContribution'
import { canOpenReview } from '@/features/submissions/review/buildSubmissionSummary'

/** Internal per-contribution success — IDs retained for support, not shown as a shared reference. */
export interface ContributionSubmitSuccess {
  contributionId: string
  title: string
  submissionId: number
  resourceId: number
  proposedVersionId: number
}

export interface ContributionSubmitFailure {
  contributionId: string
  title: string
  message: string
  statusCode?: number
}

/**
 * Extensible success metadata for future PDF / email features.
 * Do not invent values — leave unset until the product supports them.
 */
export interface SubmissionSuccessExtras {
  submittedAt?: string
  submissionReference?: string
  downloadableSummaryAvailable?: boolean
  emailSummaryAvailable?: boolean
}

export type SubmitSubmissionResult =
  | {
      status: 'success'
      succeeded: ContributionSubmitSuccess[]
      extras: SubmissionSuccessExtras
    }
  | {
      status: 'partial'
      succeeded: ContributionSubmitSuccess[]
      failed: ContributionSubmitFailure[]
    }
  | {
      status: 'failure'
      failed: ContributionSubmitFailure[]
    }

export class SubmissionValidationError extends Error {
  readonly blockers: string[]

  constructor(blockers: string[]) {
    super(blockers[0] ?? 'This submission is not ready to send.')
    this.name = 'SubmissionValidationError'
    this.blockers = blockers
  }
}

export interface SubmitSubmissionOptions {
  signal?: AbortSignal
}

/**
 * High-level entry: one logical SubmissionDraft → sequential POSTs.
 * UI must call this instead of constructing payloads or looping requests.
 */
export async function submitSubmission(
  draft: SubmissionDraft,
  options: SubmitSubmissionOptions = {},
): Promise<SubmitSubmissionResult> {
  assertDraftReady(draft)

  const contributions = draft.contributions.slice(
    0,
    MAX_CONTRIBUTIONS_PER_SUBMISSION,
  )

  const succeeded: ContributionSubmitSuccess[] = []
  const failed: ContributionSubmitFailure[] = []

  for (const contribution of contributions) {
    if (options.signal?.aborted) {
      failed.push({
        contributionId: contribution.id,
        title: contributionTitle(contribution),
        message:
          'Submission was cancelled before this contribution could be sent.',
      })
      // Mark remaining as not attempted with clear messaging
      const remaining = contributions.slice(
        contributions.indexOf(contribution) + 1,
      )
      for (const rest of remaining) {
        failed.push({
          contributionId: rest.id,
          title: contributionTitle(rest),
          message:
            'This contribution was not sent because submission was cancelled.',
        })
      }
      break
    }

    try {
      const payload = mapContributionToRequest(
        contribution,
        draft.contributor,
      )
      const data = await createSubmission(payload, options.signal)
      succeeded.push({
        contributionId: contribution.id,
        title: contributionTitle(contribution),
        submissionId: data.submission_id,
        resourceId: data.resource_id,
        proposedVersionId: data.proposed_version_id,
      })
    } catch (error) {
      failed.push({
        contributionId: contribution.id,
        title: contributionTitle(contribution),
        message: toHumanErrorMessage(error, contributionTitle(contribution)),
        statusCode: error instanceof ApiError ? error.status : undefined,
      })
    }
  }

  if (failed.length === 0) {
    return {
      status: 'success',
      succeeded,
      extras: {},
    }
  }

  if (succeeded.length === 0) {
    return { status: 'failure', failed }
  }

  return { status: 'partial', succeeded, failed }
}

/**
 * Single POST /submissions with a ready payload.
 * Prefer this for one-shot flows (e.g. update request). Multi-contribution
 * drafts should use {@link submitSubmission}.
 */
export async function submitCreateSubmissionRequest(
  payload: CreateSubmissionRequestDto,
  options: SubmitSubmissionOptions = {},
): Promise<CreateSubmissionResponseDto> {
  return api.post<CreateSubmissionResponseDto>('/submissions', payload, {
    signal: options.signal,
  })
}

async function createSubmission(
  payload: CreateSubmissionRequestDto,
  signal?: AbortSignal,
): Promise<CreateSubmissionResponseDto> {
  return submitCreateSubmissionRequest(payload, { signal })
}

function assertDraftReady(draft: SubmissionDraft): void {
  const blockers: string[] = []

  if (draft.contributions.length === 0) {
    blockers.push('Add at least one contribution before submitting.')
  }

  if (draft.contributions.length > MAX_CONTRIBUTIONS_PER_SUBMISSION) {
    blockers.push(
      `You can include up to ${MAX_CONTRIBUTIONS_PER_SUBMISSION} contributions in one submission.`,
    )
  }

  if (!isContributorComplete(draft.contributor)) {
    blockers.push('Complete your contact information before submitting.')
  }

  if (!draft.consent) {
    blockers.push(
      'Confirm that the information provided is accurate before submitting.',
    )
  }

  if (!canOpenReview(draft)) {
    blockers.push(
      'Every contribution needs to be complete before submitting.',
    )
  }

  if (blockers.length > 0) {
    throw new SubmissionValidationError(blockers)
  }
}

function contributionTitle(contribution: Contribution): string {
  const title = contribution.title.trim()
  return title || 'Untitled contribution'
}

/**
 * Translate transport failures into human-readable messages.
 * Never expose HTTP jargon, payloads, or stack traces to the UI.
 */
export function toHumanErrorMessage(
  error: unknown,
  contributionTitle: string,
): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return `We couldn’t submit “${contributionTitle}” because the submission limit has been reached. Please try again later.`
    }
    if (error.status === 404) {
      return `We couldn’t submit “${contributionTitle}” because that resource is no longer available.`
    }
    if (error.status >= 500 || error.status === 0) {
      return `We couldn’t submit “${contributionTitle}” right now. Your information has been saved in this browser so you can try again.`
    }
    if (error.status === 400 || error.status === 422) {
      const backend = sanitizeBackendMessage(error.message)
      if (backend) {
        return `We couldn’t submit “${contributionTitle}”: ${backend}`
      }
    }
    return `We couldn’t submit “${contributionTitle}” right now. Your information has been saved in this browser so you can try again.`
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return `Submission of “${contributionTitle}” was cancelled.`
  }

  return `We couldn’t submit “${contributionTitle}” right now. Your information has been saved in this browser so you can try again.`
}

function sanitizeBackendMessage(message: string): string | null {
  const trimmed = message.trim()
  if (!trimmed) return null
  // Avoid dumping technical validation internals.
  if (/stack|traceback|sqlalchemy|json/i.test(trimmed)) return null
  if (trimmed.length > 280) return `${trimmed.slice(0, 277)}…`
  return trimmed
}
