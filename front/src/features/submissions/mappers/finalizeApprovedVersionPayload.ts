import type { ApprovedResourceVersionPayload } from '@/types/moderationSubmission'
import { compactPayload, trimText } from './notes'

/**
 * Compact optional fields while always retaining `name` (required by the
 * approved_version contract even when empty — callers/backends validate).
 */
export function finalizeApprovedVersionPayload(
  payload: ApprovedResourceVersionPayload,
): ApprovedResourceVersionPayload {
  const name = trimText(payload.name)
  const compacted = compactPayload({
    ...payload,
    name: name || undefined,
  })
  return {
    ...compacted,
    name,
  }
}
