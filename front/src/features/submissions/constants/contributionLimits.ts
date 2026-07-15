/**
 * Frontend-only submission contribution cap.
 * Not an API or backend rate limit — logical draft UX only.
 */
export const MAX_CONTRIBUTIONS_PER_SUBMISSION = 5

export function canAddContribution(savedCount: number): boolean {
  return savedCount < MAX_CONTRIBUTIONS_PER_SUBMISSION
}

export function isContributionLimitReached(savedCount: number): boolean {
  return savedCount >= MAX_CONTRIBUTIONS_PER_SUBMISSION
}

export function contributionCountLabel(savedCount: number): string {
  return `${savedCount} of ${MAX_CONTRIBUTIONS_PER_SUBMISSION} contributions added`
}

export const CONTRIBUTION_LIMIT_HELPER = `You can include up to ${MAX_CONTRIBUTIONS_PER_SUBMISSION} contributions in one submission.`

export const CONTRIBUTION_LIMIT_REACHED_MESSAGE = `You've reached the maximum of ${MAX_CONTRIBUTIONS_PER_SUBMISSION} contributions for this submission. If you have more to share, you can submit another form afterward.`

export const CONTRIBUTION_LIMIT_RESTORE_NOTICE = `Only the first ${MAX_CONTRIBUTIONS_PER_SUBMISSION} contributions from your draft were restored so this submission stays within the allowed limit.`
