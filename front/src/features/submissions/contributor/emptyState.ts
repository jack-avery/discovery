import type {
  ContributorInfo,
  RelationshipOption,
} from '@/types/submission'

const RELATIONSHIP_VALUES: RelationshipOption[] = [
  'represent',
  'volunteer',
  'user',
  'someone_told_me',
  'public_info',
  'other',
]

export function createEmptyContributorInfo(): ContributorInfo {
  return {
    name: '',
    email: '',
    phone: '',
    preferredContactMethod: null,
    relationship: null,
    relationshipOther: '',
  }
}

export function normalizeContributorInfo(
  value: Partial<ContributorInfo> | null | undefined,
): ContributorInfo {
  const base = createEmptyContributorInfo()
  if (!value || typeof value !== 'object') return base

  const preferred = value.preferredContactMethod
  const relationship = value.relationship
  return {
    name: typeof value.name === 'string' ? value.name : '',
    email: typeof value.email === 'string' ? value.email : '',
    phone: typeof value.phone === 'string' ? value.phone : '',
    preferredContactMethod:
      preferred === 'email' || preferred === 'phone' || preferred === 'either'
        ? preferred
        : null,
    relationship:
      typeof relationship === 'string' &&
      RELATIONSHIP_VALUES.includes(relationship)
        ? relationship
        : null,
    relationshipOther:
      typeof value.relationshipOther === 'string'
        ? value.relationshipOther
        : '',
  }
}

export function preferredContactLabel(
  method: ContributorInfo['preferredContactMethod'],
): string {
  if (method === 'email') return 'Email'
  if (method === 'phone') return 'Phone'
  if (method === 'either') return 'No preference'
  return 'Not selected'
}
