import type { ContributorInfo } from '@/types/submission'
import { normalizePhoneE164 } from '@/utils/phone'
import { PREFERRED_CONTACT_LABELS } from './labels'
import { line, trimText } from './notes'

export interface SubmitterFields {
  submitter_name?: string
  submitter_email?: string
  submitter_phone?: string
}

export function mapSubmitterFields(
  contributor: ContributorInfo,
): SubmitterFields {
  const name = trimText(contributor.name)
  const email = trimText(contributor.email)
  const phone = normalizePhoneE164(contributor.phone) ?? undefined

  return {
    ...(name ? { submitter_name: name } : {}),
    ...(email ? { submitter_email: email } : {}),
    ...(phone ? { submitter_phone: phone } : {}),
  }
}

export function preferredContactMessageLine(
  contributor: ContributorInfo,
): string | null {
  if (!contributor.preferredContactMethod) return null
  return line(
    'Preferred contact method',
    PREFERRED_CONTACT_LABELS[contributor.preferredContactMethod],
  )
}

export function joinMessageParts(
  parts: Array<string | null | undefined>,
): string | undefined {
  const lines = parts.map((p) => trimText(p ?? '')).filter(Boolean)
  if (lines.length === 0) return undefined
  return lines.join('\n\n')
}
