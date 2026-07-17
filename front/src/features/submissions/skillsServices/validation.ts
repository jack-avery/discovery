import type { SkillsServicesData } from '@/types/submission'
import { SKILLS_TITLE_MAX_LENGTH } from '@/types/submission'

export interface SkillsFieldErrors {
  title?: string
  description?: string
  aboutYou?: string
}

export function validateSkillsServices(
  data: SkillsServicesData,
): SkillsFieldErrors {
  const errors: SkillsFieldErrors = {}
  const title = data.title.trim()
  if (!title) errors.title = 'Add a short title for what you would like to offer.'
  else if (title.length > SKILLS_TITLE_MAX_LENGTH) {
    errors.title = `Title must be ${SKILLS_TITLE_MAX_LENGTH} characters or fewer.`
  }
  if (!data.description.trim()) {
    errors.description =
      'Tell us a little about what you would like to offer.'
  }
  if (!data.aboutYou.trim()) {
    errors.aboutYou = 'Tell us a little about yourself.'
  }
  return errors
}

export function isSkillsServicesComplete(data: SkillsServicesData): boolean {
  return Object.keys(validateSkillsServices(data)).length === 0
}

/** Unlock optional sections once the core offer is described. */
export function isSkillsOfferReady(data: SkillsServicesData): boolean {
  return Boolean(data.title.trim() && data.description.trim())
}

/** Soft progressive unlock for the sticky section progress indicator. */
export function getRevealedSkillsSections(data: SkillsServicesData): number {
  return isSkillsOfferReady(data) ? SKILLS_SECTIONS.length : 1
}

export const SKILLS_SECTIONS = [
  'Offer',
  'Audience',
  'Availability',
  'Languages',
  'About you',
  'Inspiration',
  'Connection',
] as const
