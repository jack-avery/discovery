import type {
  Contribution,
  ContributorInfo,
  ExistingResourceData,
} from '@/types/submission'
import type { ApprovedResourceVersionPayload } from '@/types/moderationSubmission'
import type { CreateSubmissionRequestDto } from '@/types/submissionApi'
import type { ApprovedVersionSourceFields } from './approvedVersionSource'
import {
  buildLocationDetailNotes,
  ensureWebsiteContact,
  joinNoteSections,
  mapPublicContacts,
  mapPublicLocations,
} from './contactsAndLocations'
import { mapResourceCostDescription } from './cost'
import { buildHoursNoteSections, mapPublicHours } from './hours'
import { ACCESS_MODE_LABELS, RELATIONSHIP_LABELS } from './labels'
import { compactPayload, line, trimText, type NoteSection } from './notes'
import {
  joinMessageParts,
  mapSubmitterFields,
  preferredContactMessageLine,
} from './submitter'
import { finalizeApprovedVersionPayload } from './finalizeApprovedVersionPayload'

/**
 * Temporary backend resource_type — mapper-only, not shown in UI.
 * Existing Resource → Organization (backend default / interim strategy).
 */
const TEMP_RESOURCE_TYPE = 'Organization' as const

export function mapExistingResourceContribution(
  contribution: Contribution,
  contributor: ContributorInfo,
): CreateSubmissionRequestDto {
  if (contribution.data.kind !== 'existing_resource') {
    throw new Error('Expected existing_resource contribution data.')
  }

  return buildExistingResourceRequest({
    data: contribution.data,
    contributor,
    title: contribution.title,
    submissionType: 'new_resource',
  })
}

/**
 * Build an update_resource payload from proposed editor data.
 * Shared field mapping with new_resource; only type and resource_id differ.
 */
export function mapUpdateResourceRequest(
  resourceId: number,
  data: ExistingResourceData,
  contributor: ContributorInfo,
  title?: string,
): CreateSubmissionRequestDto {
  return buildExistingResourceRequest({
    data,
    contributor,
    title,
    submissionType: 'update_resource',
    resourceId,
  })
}

/**
 * Publishable resource/version content for an existing-resource form model.
 * Does not include submission, contributor, or moderation fields.
 */
export function mapExistingResourceVersionContent(
  data: ExistingResourceData,
  source: ApprovedVersionSourceFields = {},
): ApprovedResourceVersionPayload {
  const name = trimText(data.name) || trimText(source.name)

  let contacts = mapPublicContacts(data.contacts)
  contacts = ensureWebsiteContact(contacts, data.onlineUrl)

  const locations =
    data.accessMode === 'online' ? [] : mapPublicLocations(data.locations)

  const hours = mapPublicHours(data.hoursAvailability, data.hours)
  const resourceType = trimText(source.resource_type) || undefined
  const imageUrl = trimText(source.image_url) || undefined

  return finalizeApprovedVersionPayload({
    name,
    resource_type: resourceType,
    description: trimText(data.description) || undefined,
    eligibility: trimText(data.eligibility) || undefined,
    cost_description: mapResourceCostDescription(
      data.costOption,
      data.costDetails,
    ),
    accessibility_notes: trimText(data.accessibilityNotes) || undefined,
    general_notes: buildExistingResourceNotes(data),
    image_url: imageUrl,
    category_ids: data.categoryIds.length > 0 ? [...data.categoryIds] : undefined,
    tag_ids: data.filterIds.length > 0 ? [...data.filterIds] : undefined,
    locations: locations.length > 0 ? locations : undefined,
    contacts: contacts.length > 0 ? contacts : undefined,
    hours: hours.length > 0 ? hours : undefined,
  })
}

function buildExistingResourceRequest({
  data,
  contributor,
  title,
  submissionType,
  resourceId,
}: {
  data: ExistingResourceData
  contributor: ContributorInfo
  title?: string
  submissionType: 'new_resource' | 'update_resource'
  resourceId?: number
}): CreateSubmissionRequestDto {
  const content = mapExistingResourceVersionContent(data, {
    name: title,
    resource_type: TEMP_RESOURCE_TYPE,
  })

  if (!trimText(content.name)) {
    throw new Error('Existing resource contribution is missing a name.')
  }

  const submissionMessage = joinMessageParts([
    preferredContactMessageLine(contributor),
    relationshipMessage(contributor, data),
  ])

  const payload: CreateSubmissionRequestDto = {
    submission_type: submissionType,
    ...content,
    ...mapSubmitterFields(contributor),
    submission_message: submissionMessage,
  }

  if (submissionType === 'update_resource' && resourceId != null) {
    payload.resource_id = resourceId
  }

  return compactPayload(payload)
}

function relationshipMessage(
  contributor: ContributorInfo,
  data: ExistingResourceData,
): string | null {
  // Prefer contributor (current UI); fall back to legacy per-resource field.
  const relationship = contributor.relationship ?? data.relationship
  const relationshipOther =
    trimText(contributor.relationshipOther) ||
    trimText(data.relationshipOther)
  if (!relationship) return null
  const label =
    relationship === 'other' && relationshipOther
      ? relationshipOther
      : RELATIONSHIP_LABELS[relationship]
  return line('Connection to this resource', label)
}

function buildExistingResourceNotes(
  data: ExistingResourceData,
): string | undefined {
  const sections: Array<NoteSection | null> = []

  if (data.accessMode) {
    const accessLines = [
      line('Access type', ACCESS_MODE_LABELS[data.accessMode]),
    ]
    if (
      (data.accessMode === 'online' || data.accessMode === 'both') &&
      trimText(data.onlineUrl)
    ) {
      accessLines.push(line('Online access link', data.onlineUrl))
    }
    sections.push({
      heading: 'Access:',
      lines: accessLines.filter(Boolean) as string[],
    })
  }

  if (data.accessMode !== 'online') {
    sections.push(buildLocationDetailNotes(data.locations))
  }

  sections.push(...buildHoursNoteSections(data.hoursAvailability, data.hours))

  if (trimText(data.moreInfoUrl)) {
    sections.push({
      heading: 'More information:',
      lines: [trimText(data.moreInfoUrl)],
    })
  }

  if (trimText(data.generalNotes)) {
    sections.push({
      heading: 'Additional details:',
      lines: [trimText(data.generalNotes)],
    })
  }

  return joinNoteSections(sections)
}
