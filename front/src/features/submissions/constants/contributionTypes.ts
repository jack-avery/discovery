import type {
  Contribution,
  ContributionType,
  SavedContributionPayload,
  SubmissionDraft,
} from '@/types/submission'
import { SUBMISSION_DRAFT_SCHEMA_VERSION } from '@/types/submission'
import {
  Building2,
  CalendarDays,
  HandHeart,
  type LucideIcon,
} from 'lucide-react'
import {
  createEmptyExistingResourceData,
  createPlaceholderData,
} from '../existingResource/emptyState'
import { createEmptyContributorInfo } from '../contributor/emptyState'
import { createEmptySkillsServicesData } from '../skillsServices/emptyState'
import { createEmptyEventData } from '../event/emptyState'

export interface ContributionTypeMeta {
  type: ContributionType
  label: string
  description: string
  examples: string
  icon: LucideIcon
  placeholderTitle: string
}

export const CONTRIBUTION_TYPE_META: Record<
  ContributionType,
  ContributionTypeMeta
> = {
  existing_resource: {
    type: 'existing_resource',
    label: 'Existing Resource or Service',
    description:
      'Add an organization, program, service, or place that already exists in our community.',
    examples:
      'Food banks, shelters, recreation centres, clinics, drop-in services, etc.',
    icon: Building2,
    placeholderTitle: 'Untitled resource',
  },
  community_asset: {
    type: 'community_asset',
    label: 'My Skills or Services',
    description:
      'Share something you personally can offer, such as your skills, knowledge, time, space, equipment, or transportation.',
    examples:
      'Tutoring, translation, transportation, meeting space, equipment, etc.',
    icon: HandHeart,
    placeholderTitle: 'Untitled skills or services',
  },
  event: {
    type: 'event',
    label: 'Event',
    description:
      'Share an upcoming one-time or recurring event that community members may benefit from.',
    examples:
      'Community cleanups, workshops, markets, information sessions, cultural events, etc.',
    icon: CalendarDays,
    placeholderTitle: 'Untitled event',
  },
}

export const CONTRIBUTION_TYPE_ORDER: ContributionType[] = [
  'existing_resource',
  'community_asset',
  'event',
]

export function createContributionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `contribution-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createSubmissionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `submission-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyContribution(type: ContributionType): Contribution {
  const meta = CONTRIBUTION_TYPE_META[type]
  const data =
    type === 'existing_resource'
      ? createEmptyExistingResourceData()
      : type === 'community_asset'
        ? createEmptySkillsServicesData()
        : type === 'event'
          ? createEmptyEventData()
          : createPlaceholderData()

  return {
    id: createContributionId(),
    type,
    status: 'incomplete',
    title: meta.placeholderTitle,
    summary: 'Details will appear here once the editor is completed.',
    highlights: [],
    data,
  }
}

export function createEmptySubmissionDraft(): SubmissionDraft {
  return {
    id: createSubmissionId(),
    contributions: [],
    contributor: createEmptyContributorInfo(),
    consent: false,
    ui: {
      editor: null,
      showTypePicker: false,
      showContributorEditor: false,
      showReview: false,
      phase: 'editing',
    },
    meta: {
      updatedAt: new Date().toISOString(),
      version: SUBMISSION_DRAFT_SCHEMA_VERSION,
    },
  }
}

export type { SavedContributionPayload }
