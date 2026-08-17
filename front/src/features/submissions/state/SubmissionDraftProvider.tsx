import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import type {
  Contribution,
  ContributionType,
  ContributorInfo,
  SavedContributionPayload,
  SubmissionDraft,
} from '@/types/submission'
import { SUBMISSION_DRAFT_SCHEMA_VERSION } from '@/types/submission'
import {
  clearStoredDraft,
  createDraftAutosave,
  hasStoredDraft,
  readStoredDraft,
  writeStoredDraft,
} from './draftStorage'
import {
  CONTRIBUTION_TYPE_META,
  createContributionId,
  createEmptySubmissionDraft,
} from '../constants/contributionTypes'
import {
  canAddContribution,
  CONTRIBUTION_LIMIT_RESTORE_NOTICE,
  MAX_CONTRIBUTIONS_PER_SUBMISSION,
} from '../constants/contributionLimits'
import { normalizeExistingResourceData } from '../existingResource/emptyState'
import { normalizeSkillsServicesData } from '../skillsServices/emptyState'
import { normalizeEventContributionData } from '../event/emptyState'
import { normalizeContributorInfo } from '../contributor/emptyState'

interface SubmissionDraftContextValue {
  draft: SubmissionDraft
  showRestoreBanner: boolean
  /** Set when a restored draft was truncated to the contribution maximum. */
  restoreNotice: string | null
  clearRestoreNotice: () => void
  beginCreateContribution: (type: ContributionType) => void
  beginEditContribution: (id: string) => void
  closeEditor: () => void
  /**
   * Persist editor payload into the draft.
   * Returns false when a new create would exceed the contribution limit.
   */
  saveEditorContribution: (payload: SavedContributionPayload) => boolean
  openTypePicker: () => void
  closeTypePicker: () => void
  removeContribution: (id: string) => void
  openContributorEditor: () => void
  closeContributorEditor: () => void
  saveContributor: (contributor: ContributorInfo) => void
  openReview: () => void
  closeReview: () => void
  /**
   * After partial success: remove accepted contributions from the draft so
   * retry cannot duplicate them. Keeps contributor details.
   */
  retainFailedContributions: (failedContributionIds: string[]) => void
  /** Full success: clear persisted draft and show the success phase. */
  completeSuccessfulSubmission: () => void
  /** Start a clean draft after success (Submit another contribution). */
  startNewSubmission: () => void
  continueDraft: () => void
  discardDraft: () => void
  dismissRestoreBanner: () => void
  /** True while the review Submit batch is actively posting to the API. */
  isSubmitting: boolean
  setIsSubmitting: (active: boolean) => void
}

const SubmissionDraftContext = createContext<SubmissionDraftContextValue | null>(
  null,
)

function touchDraft(draft: SubmissionDraft): SubmissionDraft {
  return {
    ...draft,
    meta: {
      ...draft.meta,
      updatedAt: new Date().toISOString(),
      version: SUBMISSION_DRAFT_SCHEMA_VERSION,
    },
  }
}

export function SubmissionDraftProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [draft, setDraft] = useState<SubmissionDraft>(() =>
    createEmptySubmissionDraft(),
  )
  const [showRestoreBanner, setShowRestoreBanner] = useState(false)
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const persistenceEnabledRef = useRef(true)

  const draftRef = useRef(draft)
  draftRef.current = draft

  const autosaveRef = useRef(createDraftAutosave(() => draftRef.current))

  useEffect(() => {
    const autosave = autosaveRef.current
    return () => autosave.dispose()
  }, [])

  useEffect(() => {
    if (hasStoredDraft()) {
      persistenceEnabledRef.current = false
      setShowRestoreBanner(true)
    } else {
      persistenceEnabledRef.current = true
    }
  }, [])

  const persistSoon = useCallback(() => {
    if (!persistenceEnabledRef.current) return
    autosaveRef.current.schedule()
  }, [])

  const updateDraft = useCallback(
    (updater: (current: SubmissionDraft) => SubmissionDraft) => {
      setDraft((current) => {
        const next = touchDraft(updater(current))
        draftRef.current = next
        if (persistenceEnabledRef.current) {
          autosaveRef.current.schedule()
        }
        return next
      })
    },
    [],
  )

  const beginCreateContribution = useCallback(
    (type: ContributionType) => {
      updateDraft((current) => {
        if (
          !canAddContribution(
            current.contributions.length,
            isAuthenticated,
          )
        ) {
          return {
            ...current,
            ui: {
              ...current.ui,
              showTypePicker: false,
              editor: null,
            },
          }
        }
        return {
          ...current,
          ui: {
            ...current.ui,
            showTypePicker: false,
            showContributorEditor: false,
            showReview: false,
            editor: {
              mode: 'create',
              type,
              contributionId: null,
            },
          },
        }
      })
    },
    [isAuthenticated, updateDraft],
  )

  const beginEditContribution = useCallback(
    (id: string) => {
      updateDraft((current) => {
        const existing = current.contributions.find((c) => c.id === id)
        if (!existing) return current
        return {
          ...current,
          ui: {
            ...current.ui,
            showTypePicker: false,
            showContributorEditor: false,
            showReview: false,
            editor: {
              mode: 'edit',
              type: existing.type,
              contributionId: existing.id,
            },
          },
        }
      })
    },
    [updateDraft],
  )

  const closeEditor = useCallback(() => {
    updateDraft((current) => ({
      ...current,
      ui: {
        ...current.ui,
        editor: null,
      },
    }))
  }, [updateDraft])

  const saveEditorContribution = useCallback(
    (payload: SavedContributionPayload): boolean => {
      const current = draftRef.current
      const session = current.ui.editor
      if (!session) return false

      if (session.mode === 'create') {
        if (
          !canAddContribution(
            current.contributions.length,
            isAuthenticated,
          )
        ) {
          updateDraft((latest) => ({
            ...latest,
            ui: {
              ...latest.ui,
              editor: null,
              showTypePicker: false,
            },
          }))
          return false
        }

        const contribution: Contribution = {
          id: createContributionId(),
          type: session.type,
          status: payload.status,
          title: payload.title,
          summary: payload.summary,
          highlights: payload.highlights,
          data: payload.data,
        }
        const previousCount = current.contributions.length

        updateDraft((latest) => {
          if (
            !canAddContribution(
              latest.contributions.length,
              isAuthenticated,
            )
          ) {
            return {
              ...latest,
              ui: {
                ...latest.ui,
                editor: null,
                showTypePicker: false,
              },
            }
          }
          return {
            ...latest,
            contributions: [...latest.contributions, contribution],
            ui: {
              ...latest.ui,
              editor: null,
              showTypePicker: false,
            },
          }
        })

        return draftRef.current.contributions.length > previousCount
      }

      updateDraft((latest) => ({
        ...latest,
        contributions: latest.contributions.map((c) =>
          c.id === session.contributionId
            ? {
                ...c,
                status: payload.status,
                title: payload.title,
                summary: payload.summary,
                highlights: payload.highlights,
                data: payload.data,
              }
            : c,
        ),
        ui: {
          ...latest.ui,
          editor: null,
          showTypePicker: false,
        },
      }))
      return true
    },
    [isAuthenticated, updateDraft],
  )

  const openTypePicker = useCallback(() => {
    updateDraft((current) => {
      if (
        !canAddContribution(current.contributions.length, isAuthenticated)
      ) {
        return {
          ...current,
          ui: {
            ...current.ui,
            showTypePicker: false,
            editor: null,
          },
        }
      }
      return {
        ...current,
        ui: {
          ...current.ui,
          showTypePicker: true,
          editor: null,
          showContributorEditor: false,
          showReview: false,
        },
      }
    })
  }, [isAuthenticated, updateDraft])

  const closeTypePicker = useCallback(() => {
    updateDraft((current) => ({
      ...current,
      ui: { ...current.ui, showTypePicker: false },
    }))
  }, [updateDraft])

  const openContributorEditor = useCallback(() => {
    updateDraft((current) => ({
      ...current,
      ui: {
        ...current.ui,
        showTypePicker: false,
        editor: null,
        showReview: false,
        showContributorEditor: true,
      },
    }))
  }, [updateDraft])

  const closeContributorEditor = useCallback(() => {
    updateDraft((current) => ({
      ...current,
      ui: {
        ...current.ui,
        showContributorEditor: false,
      },
    }))
  }, [updateDraft])

  const saveContributor = useCallback(
    (contributor: ContributorInfo) => {
      updateDraft((current) => ({
        ...current,
        contributor: normalizeContributorInfo(contributor),
        ui: {
          ...current.ui,
          showContributorEditor: false,
        },
      }))
    },
    [updateDraft],
  )

  const openReview = useCallback(() => {
    updateDraft((current) => ({
      ...current,
      ui: {
        ...current.ui,
        showTypePicker: false,
        editor: null,
        showContributorEditor: false,
        showReview: true,
      },
    }))
  }, [updateDraft])

  const closeReview = useCallback(() => {
    updateDraft((current) => ({
      ...current,
      ui: {
        ...current.ui,
        showReview: false,
      },
    }))
  }, [updateDraft])

  const retainFailedContributions = useCallback(
    (failedContributionIds: string[]) => {
      const failed = new Set(failedContributionIds)
      updateDraft((current) => ({
        ...current,
        contributions: current.contributions.filter((c) => failed.has(c.id)),
        // Keep review open so the caller can show a partial-success surface.
        // Successful items are removed so retry cannot duplicate them.
        ui: {
          ...current.ui,
          editor: null,
          showTypePicker: false,
          showContributorEditor: false,
          phase: 'editing',
        },
      }))
    },
    [updateDraft],
  )

  const completeSuccessfulSubmission = useCallback(() => {
    clearStoredDraft()
    const empty = createEmptySubmissionDraft()
    empty.ui.phase = 'success'
    setDraft(empty)
    draftRef.current = empty
    // Do not persist the empty success shell — prevents refresh restoring an empty "success" draft.
    persistenceEnabledRef.current = false
    setShowRestoreBanner(false)
    setRestoreNotice(null)
  }, [])

  const startNewSubmission = useCallback(() => {
    clearStoredDraft()
    const empty = createEmptySubmissionDraft()
    setDraft(empty)
    draftRef.current = empty
    persistenceEnabledRef.current = true
    setShowRestoreBanner(false)
    setRestoreNotice(null)
  }, [])

  const removeContribution = useCallback(
    (id: string) => {
      updateDraft((current) => {
        const contributions = current.contributions.filter((c) => c.id !== id)
        const editor = current.ui.editor
        const editingRemoved =
          editor?.mode === 'edit' && editor.contributionId === id
        return {
          ...current,
          contributions,
          ui: {
            ...current.ui,
            editor: editingRemoved ? null : editor,
            showTypePicker:
              contributions.length === 0 ? false : current.ui.showTypePicker,
          },
        }
      })
    },
    [updateDraft],
  )

  const continueDraft = useCallback(() => {
    const stored = readStoredDraft()
    if (stored) {
      const { draft: normalized, truncated } = normalizeDraft(
        stored,
        isAuthenticated,
      )
      setDraft(normalized)
      draftRef.current = normalized
      setRestoreNotice(
        truncated ? CONTRIBUTION_LIMIT_RESTORE_NOTICE : null,
      )
    }
    persistenceEnabledRef.current = true
    setShowRestoreBanner(false)
    persistSoon()
  }, [isAuthenticated, persistSoon])

  const discardDraft = useCallback(() => {
    clearStoredDraft()
    const empty = createEmptySubmissionDraft()
    setDraft(empty)
    draftRef.current = empty
    persistenceEnabledRef.current = true
    setShowRestoreBanner(false)
    setRestoreNotice(null)
  }, [])

  const dismissRestoreBanner = useCallback(() => {
    setShowRestoreBanner(false)
  }, [])

  const clearRestoreNotice = useCallback(() => {
    setRestoreNotice(null)
  }, [])

  useEffect(() => {
    return () => {
      if (persistenceEnabledRef.current) {
        writeStoredDraft(draftRef.current)
      }
    }
  }, [])

  const value = useMemo<SubmissionDraftContextValue>(
    () => ({
      draft,
      showRestoreBanner,
      restoreNotice,
      clearRestoreNotice,
      beginCreateContribution,
      beginEditContribution,
      closeEditor,
      saveEditorContribution,
      openTypePicker,
      closeTypePicker,
      removeContribution,
      openContributorEditor,
      closeContributorEditor,
      saveContributor,
      openReview,
      closeReview,
      retainFailedContributions,
      completeSuccessfulSubmission,
      startNewSubmission,
      continueDraft,
      discardDraft,
      dismissRestoreBanner,
      isSubmitting,
      setIsSubmitting,
    }),
    [
      draft,
      showRestoreBanner,
      restoreNotice,
      clearRestoreNotice,
      beginCreateContribution,
      beginEditContribution,
      closeEditor,
      saveEditorContribution,
      openTypePicker,
      closeTypePicker,
      removeContribution,
      openContributorEditor,
      closeContributorEditor,
      saveContributor,
      openReview,
      closeReview,
      retainFailedContributions,
      completeSuccessfulSubmission,
      startNewSubmission,
      continueDraft,
      discardDraft,
      dismissRestoreBanner,
      isSubmitting,
    ],
  )

  return (
    <SubmissionDraftContext.Provider value={value}>
      {children}
    </SubmissionDraftContext.Provider>
  )
}

function normalizeContributionData(
  data: Contribution['data'] | undefined,
): Contribution['data'] {
  if (!data) return { kind: 'placeholder' }
  if (data.kind === 'existing_resource') {
    return normalizeExistingResourceData(data)
  }
  if (data.kind === 'community_asset') {
    return normalizeSkillsServicesData(data)
  }
  if (data.kind === 'event') {
    return normalizeEventContributionData(data)
  }
  return data
}

function normalizeDraft(
  draft: SubmissionDraft,
  isAuthenticated: boolean,
): {
  draft: SubmissionDraft
  truncated: boolean
} {
  const truncated =
    !isAuthenticated &&
    draft.contributions.length > MAX_CONTRIBUTIONS_PER_SUBMISSION
  const contributions = (
    truncated
      ? draft.contributions.slice(0, MAX_CONTRIBUTIONS_PER_SUBMISSION)
      : draft.contributions
  ).map((c) => ({
    ...c,
    highlights: c.highlights ?? [],
    summary:
      c.summary ??
      'Details will appear here once the editor is completed.',
    data: normalizeContributionData(c.data),
  }))

  let contributor = normalizeContributorInfo(draft.contributor)
  // Migrate legacy per-resource connection answers onto the contributor.
  if (!contributor.relationship) {
    const legacy = contributions.find(
      (c) =>
        c.data.kind === 'existing_resource' && c.data.relationship != null,
    )
    if (legacy && legacy.data.kind === 'existing_resource') {
      contributor = normalizeContributorInfo({
        ...contributor,
        relationship: legacy.data.relationship,
        relationshipOther: legacy.data.relationshipOther,
      })
    }
  }

  return {
    truncated,
    draft: {
      id: draft.id,
      contributions,
      contributor,
      ui: {
        // Transient sheet UI is always closed on restore.
        editor: null,
        showTypePicker: false,
        showContributorEditor: false,
        showReview: false,
        phase: draft.ui.phase ?? 'editing',
      },
      meta: {
        ...draft.meta,
        version: SUBMISSION_DRAFT_SCHEMA_VERSION,
      },
    },
  }
}

export function useSubmissionDraft() {
  const context = useContext(SubmissionDraftContext)
  if (!context) {
    throw new Error(
      'useSubmissionDraft must be used within SubmissionDraftProvider',
    )
  }
  return context
}

export function getContributionTypeLabel(type: ContributionType): string {
  return CONTRIBUTION_TYPE_META[type].label
}

export type { Contribution }
