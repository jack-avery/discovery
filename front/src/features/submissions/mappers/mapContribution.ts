import type { Contribution, ContributorInfo } from '@/types/submission'
import type { CreateSubmissionRequestDto } from '@/types/submissionApi'
import { mapExistingResourceContribution } from './mapExistingResource'
import { mapEventContribution } from './mapEvent'
import { mapSkillsServicesContribution } from './mapSkillsServices'

/**
 * Dispatch a saved contribution to the correct pure mapper.
 * Does not mutate the contribution or draft.
 */
export function mapContributionToRequest(
  contribution: Contribution,
  contributor: ContributorInfo,
): CreateSubmissionRequestDto {
  switch (contribution.type) {
    case 'existing_resource':
      return mapExistingResourceContribution(contribution, contributor)
    case 'community_asset':
      return mapSkillsServicesContribution(contribution, contributor)
    case 'event':
      return mapEventContribution(contribution, contributor)
    default: {
      const exhaustive: never = contribution.type
      throw new Error(`Unsupported contribution type: ${exhaustive}`)
    }
  }
}
