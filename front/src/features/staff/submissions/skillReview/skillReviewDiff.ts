import type { SkillsServicesData } from '@/types/submission'
import { normalizeSkillsServicesData } from '@/features/submissions/skillsServices/emptyState'

export type SkillReviewSectionId =
  | 'offer'
  | 'audience'
  | 'availability'
  | 'languages'
  | 'about'
  | 'connection'

export const SKILL_REVIEW_SECTIONS: readonly SkillReviewSectionId[] = [
  'offer',
  'audience',
  'availability',
  'languages',
  'about',
  'connection',
]

export function getEditedSkillSections(
  baseline: SkillsServicesData,
  current: SkillsServicesData,
): SkillReviewSectionId[] {
  return SKILL_REVIEW_SECTIONS.filter(
    (sectionId) =>
      JSON.stringify(sectionSnapshot(baseline, sectionId)) !==
      JSON.stringify(sectionSnapshot(current, sectionId)),
  )
}

export function hasSkillReviewChanges(
  baseline: SkillsServicesData,
  current: SkillsServicesData,
): boolean {
  return getEditedSkillSections(baseline, current).length > 0
}

export function resetSkillReviewSection(
  current: SkillsServicesData,
  baseline: SkillsServicesData,
  sectionId: SkillReviewSectionId,
): SkillsServicesData {
  const next = structuredClone(current)
  Object.assign(next, sectionSnapshot(baseline, sectionId))
  return normalizeSkillsServicesData(next)
}

function sectionSnapshot(
  data: SkillsServicesData,
  sectionId: SkillReviewSectionId,
): Partial<SkillsServicesData> {
  switch (sectionId) {
    case 'offer':
      return { title: data.title, description: data.description }
    case 'audience':
      return { whoBenefits: data.whoBenefits }
    case 'availability':
      return {
        availability: [...data.availability],
        availabilityNotes: data.availabilityNotes,
      }
    case 'languages':
      return { languages: [...data.languages] }
    case 'about':
      return { aboutYou: data.aboutYou, inspiration: data.inspiration }
    case 'connection':
      return {
        providedPersonally: data.providedPersonally,
        onBehalfOfNotes: data.onBehalfOfNotes,
      }
    default: {
      const exhaustive: never = sectionId
      return exhaustive
    }
  }
}
