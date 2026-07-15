import type {
  ContributionData,
  SkillsServicesData,
} from '@/types/submission'

export function createEmptySkillsServicesData(): SkillsServicesData {
  return {
    kind: 'community_asset',
    title: '',
    description: '',
    whoBenefits: '',
    availability: [],
    availabilityNotes: '',
    languages: [''],
    aboutYou: '',
    inspiration: '',
    providedPersonally: null,
    onBehalfOfNotes: '',
  }
}

export function isSkillsServicesData(
  data: ContributionData | undefined,
): data is SkillsServicesData {
  return data?.kind === 'community_asset'
}

export function normalizeSkillsServicesData(
  data: SkillsServicesData | Record<string, unknown>,
): SkillsServicesData {
  const base = createEmptySkillsServicesData()
  const raw = data as Partial<SkillsServicesData>

  const languages =
    Array.isArray(raw.languages) && raw.languages.length > 0
      ? raw.languages.map((l) => (typeof l === 'string' ? l : ''))
      : ['']

  const availability = Array.isArray(raw.availability)
    ? raw.availability.filter(
        (item): item is SkillsServicesData['availability'][number] =>
          item === 'weekdays' ||
          item === 'evenings' ||
          item === 'weekends' ||
          item === 'flexible',
      )
    : []

  return {
    ...base,
    ...raw,
    kind: 'community_asset',
    title: typeof raw.title === 'string' ? raw.title : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    whoBenefits: typeof raw.whoBenefits === 'string' ? raw.whoBenefits : '',
    availability,
    availabilityNotes:
      typeof raw.availabilityNotes === 'string' ? raw.availabilityNotes : '',
    languages,
    aboutYou: typeof raw.aboutYou === 'string' ? raw.aboutYou : '',
    inspiration: typeof raw.inspiration === 'string' ? raw.inspiration : '',
    providedPersonally:
      raw.providedPersonally === 'yes' || raw.providedPersonally === 'on_behalf'
        ? raw.providedPersonally
        : null,
    onBehalfOfNotes:
      typeof raw.onBehalfOfNotes === 'string' ? raw.onBehalfOfNotes : '',
  }
}
