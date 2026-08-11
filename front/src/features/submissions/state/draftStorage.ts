import type { SubmissionDraft } from '@/types/submission'
import { SUBMISSION_DRAFT_SCHEMA_VERSION } from '@/types/submission'
import { isMeaningfulDraft } from './draftMeaningfulness'

/** Versioned localStorage key — bump schema version when the draft shape breaks. */
export const SUBMISSION_DRAFT_STORAGE_KEY = `rrcrc.submitDraft.v${SUBMISSION_DRAFT_SCHEMA_VERSION}`

const AUTOSAVE_DEBOUNCE_MS = 400

export { isMeaningfulDraft } from './draftMeaningfulness'

/**
 * Read a recoverable draft from localStorage.
 * Malformed, incompatible, or empty/default drafts return null and remove the
 * stale key so junk entries (e.g. false empty v7 drafts) self-heal.
 */
export function readStoredDraft(): SubmissionDraft | null {
  try {
    const raw = localStorage.getItem(SUBMISSION_DRAFT_STORAGE_KEY)
    if (!raw) return null

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      clearStoredDraft()
      return null
    }

    if (!isValidDraftShape(parsed)) {
      clearStoredDraft()
      return null
    }

    if (!isMeaningfulDraft(parsed)) {
      clearStoredDraft()
      return null
    }

    return parsed
  } catch {
    return null
  }
}

/**
 * Persist a draft when meaningful; otherwise ensure the storage key is absent.
 * All autosave / unmount / direct write paths must go through this helper.
 */
export function writeStoredDraft(draft: SubmissionDraft): void {
  try {
    if (!isMeaningfulDraft(draft)) {
      clearStoredDraft()
      return
    }
    localStorage.setItem(SUBMISSION_DRAFT_STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Quota / private mode — scaffold ignores persistence failures.
  }
}

export function clearStoredDraft(): void {
  try {
    localStorage.removeItem(SUBMISSION_DRAFT_STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

/** True only when a valid, meaningful draft is stored. */
export function hasStoredDraft(): boolean {
  return readStoredDraft() !== null
}

/**
 * Debounced autosave scaffold. Call the returned disposer on unmount.
 * Writes are meaningfulness-gated via {@link writeStoredDraft}.
 */
export function createDraftAutosave(
  getDraft: () => SubmissionDraft,
  options?: { debounceMs?: number },
): {
  schedule: () => void
  flush: () => void
  dispose: () => void
} {
  const debounceMs = options?.debounceMs ?? AUTOSAVE_DEBOUNCE_MS
  let timer: ReturnType<typeof setTimeout> | null = null

  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    writeStoredDraft(getDraft())
  }

  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      writeStoredDraft(getDraft())
    }, debounceMs)
  }

  const dispose = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return { schedule, flush, dispose }
}

function isValidDraftShape(value: unknown): value is SubmissionDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<SubmissionDraft>
  if (
    !(
      typeof draft.id === 'string' &&
      Array.isArray(draft.contributions) &&
      typeof draft.contributor === 'object' &&
      draft.contributor !== null &&
      typeof draft.ui === 'object' &&
      draft.ui !== null &&
      typeof draft.meta === 'object' &&
      draft.meta !== null &&
      draft.meta.version === SUBMISSION_DRAFT_SCHEMA_VERSION
    )
  ) {
    return false
  }

  const contributor = draft.contributor as unknown as Record<string, unknown>
  return (
    typeof contributor.name === 'string' &&
    typeof contributor.email === 'string' &&
    typeof contributor.phone === 'string' &&
    (contributor.preferredContactMethod === null ||
      contributor.preferredContactMethod === 'email' ||
      contributor.preferredContactMethod === 'phone' ||
      contributor.preferredContactMethod === 'either')
  )
}
