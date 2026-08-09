import type { ResourceContactMethod } from '@/types/submission'
import { normalizePhoneE164 } from '@/utils/phone'

/**
 * Canonical contact snapshot for semantic equality (form dirty detection,
 * moderation structured edits, etc.).
 *
 * Phone values use the same canonical form as publish mapping
 * (`normalizePhoneE164(raw) ?? raw`). Ids and empty rows are ignored;
 * order is normalized via stable sort.
 */
export type CanonicalContact = {
  type: string
  value: string
  label: string
}

export function canonicalizeContacts(
  contacts: ResourceContactMethod[],
): CanonicalContact[] {
  return contacts
    .map((contact) => {
      const raw = contact.value.trim()
      const value =
        contact.type === 'phone' ? (normalizePhoneE164(raw) ?? raw) : raw
      return {
        type: contact.type,
        value,
        label: contact.label.trim(),
      }
    })
    .filter((contact) => contact.value)
    .sort((a, b) =>
      `${a.type}:${a.value}:${a.label}`.localeCompare(
        `${b.type}:${b.value}:${b.label}`,
      ),
    )
}

/** True when two contact lists are semantically equivalent. */
export function areContactsEquivalent(
  a: ResourceContactMethod[],
  b: ResourceContactMethod[],
): boolean {
  return (
    JSON.stringify(canonicalizeContacts(a)) ===
    JSON.stringify(canonicalizeContacts(b))
  )
}
