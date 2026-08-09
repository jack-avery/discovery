import type {
  EventContributionData,
  ExistingResourceData,
  SkillsServicesData,
} from '@/types/submission'
import type { ApprovedResourceVersionPayload } from '@/types/moderationSubmission'
import type { ApprovedVersionSourceFields } from './approvedVersionSource'
import { mapEventVersionContent } from './mapEvent'
import { mapExistingResourceVersionContent } from './mapExistingResource'
import { mapSkillsVersionContent } from './mapSkillsServices'

export type { ApprovedVersionSourceFields } from './approvedVersionSource'

/** Form models that can be translated into an approved_version snapshot. */
export type ApprovedVersionFormData =
  | ExistingResourceData
  | EventContributionData
  | SkillsServicesData

/**
 * Convert a composed moderation (or contribution) form model into the
 * backend `approved_version` payload shape.
 *
 * Pass {@link ApprovedVersionSourceFields} for publishable fields the form
 * does not own (notably `resource_type` and `image_url`) so they are not
 * dropped from the snapshot.
 *
 * Pure: no I/O, validation, or state updates.
 */
export function toApprovedVersionPayload(
  data: ApprovedVersionFormData,
  source: ApprovedVersionSourceFields = {},
): ApprovedResourceVersionPayload {
  switch (data.kind) {
    case 'existing_resource':
      return mapExistingResourceVersionContent(data, source)
    case 'event':
      return mapEventVersionContent(data, source)
    case 'community_asset':
      return mapSkillsVersionContent(data, source)
  }
}
