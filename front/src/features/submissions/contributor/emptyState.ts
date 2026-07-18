import type { ContributorInfo } from '@/types/submission'

export function createEmptyContributorInfo(): ContributorInfo {
  return {
    name: '',
    email: '',
    phone: '',
    preferredContactMethod: null,
  }
}

export function normalizeContributorInfo(
  value: Partial<ContributorInfo> | null | undefined,
): ContributorInfo {
  const base = createEmptyContributorInfo()
  if (!value || typeof value !== 'object') return base

  const preferred = value.preferredContactMethod
  return {
    name: typeof value.name === 'string' ? value.name : '',
    email: typeof value.email === 'string' ? value.email : '',
    phone: typeof value.phone === 'string' ? value.phone : '',
    preferredContactMethod:
      preferred === 'email' || preferred === 'phone' || preferred === 'either'
        ? preferred
        : null,
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
