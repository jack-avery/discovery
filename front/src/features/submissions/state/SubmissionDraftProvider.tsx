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
import type {
  Contribution,
  ContributionType,
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
  createEmptyContribution,
  createEmptySubmissionDraft,
} from '../constants/contributionTypes'

interface SubmissionDraftContextValue {
  draft: SubmissionDraft
  showRestoreBanner: boolean
  /** Open create flow for a contribution type (does not add to draft yet). */
  beginCreateContribution: (type: ContributionType) => void
  /** Open editor for an existing saved contribution. */
  beginEditContribution: (id: string) => void
  closeEditor: () => void
  /**
   * Persist the in-progress editor session to the draft.
   * Create mode adds a new contribution; edit mode updates the existing one.
   * Foundation shell saves a placeholder until real editors supply values.
   */
  saveEditorContribution: () => void
  openTypePicker: () => void
  closeTypePicker: () => void
  removeContribution: (id: string) => void
  continueDraft: () => void
  discardDraft: () => void
  dismissRestoreBanner: () => void
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
  const [draft, setDraft] = useState<SubmissionDraft>(() =>
    createEmptySubmissionDraft(),
  )
  const [showRestoreBanner, setShowRestoreBanner] = useState(false)
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
      updateDraft((current) => ({
        ...current,
        ui: {
          ...current.ui,
          showTypePicker: false,
          editor: {
            mode: 'create',
            type,
            contributionId: null,
          },
        },
      }))
    },
    [updateDraft],
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

  const saveEditorContribution = useCallback(() => {
    updateDraft((current) => {
      const session = current.ui.editor
      if (!session) return current

      if (session.mode === 'create') {
        const contribution = createEmptyContribution(session.type)
        return {
          ...current,
          contributions: [...current.contributions, contribution],
          ui: {
            ...current.ui,
            editor: null,
            showTypePicker: false,
          },
        }
      }

      // Edit mode: keep existing values for Foundation; later milestones update fields.
      return {
        ...current,
        ui: {
          ...current.ui,
          editor: null,
          showTypePicker: false,
        },
      }
    })
  }, [updateDraft])

  const openTypePicker = useCallback(() => {
    updateDraft((current) => ({
      ...current,
      ui: {
        ...current.ui,
        showTypePicker: true,
        editor: null,
      },
    }))
  }, [updateDraft])

  const closeTypePicker = useCallback(() => {
    updateDraft((current) => ({
      ...current,
      ui: { ...current.ui, showTypePicker: false },
    }))
  }, [updateDraft])

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
            // If nothing left, picker shows automatically via UI logic.
            showTypePicker: contributions.length === 0 ? false : current.ui.showTypePicker,
          },
        }
      })
    },
    [updateDraft],
  )

  const continueDraft = useCallback(() => {
    const stored = readStoredDraft()
    if (stored) {
      const normalized = normalizeDraft(stored)
      setDraft(normalized)
      draftRef.current = normalized
    }
    persistenceEnabledRef.current = true
    setShowRestoreBanner(false)
    persistSoon()
  }, [persistSoon])

  const discardDraft = useCallback(() => {
    clearStoredDraft()
    const empty = createEmptySubmissionDraft()
    setDraft(empty)
    draftRef.current = empty
    persistenceEnabledRef.current = true
    setShowRestoreBanner(false)
  }, [])

  const dismissRestoreBanner = useCallback(() => {
    setShowRestoreBanner(false)
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
      beginCreateContribution,
      beginEditContribution,
      closeEditor,
      saveEditorContribution,
      openTypePicker,
      closeTypePicker,
      removeContribution,
      continueDraft,
      discardDraft,
      dismissRestoreBanner,
    }),
    [
      draft,
      showRestoreBanner,
      beginCreateContribution,
      beginEditContribution,
      closeEditor,
      saveEditorContribution,
      openTypePicker,
      closeTypePicker,
      removeContribution,
      continueDraft,
      discardDraft,
      dismissRestoreBanner,
    ],
  )

  return (
    <SubmissionDraftContext.Provider value={value}>
      {children}
    </SubmissionDraftContext.Provider>
  )
}

/** Soft-normalize older/partial drafts so Continue remains resilient. */
function normalizeDraft(draft: SubmissionDraft): SubmissionDraft {
  return {
    ...draft,
    contributions: draft.contributions.map((c) => ({
      ...c,
      summary:
        c.summary ??
        'Details will appear here once the editor is completed.',
    })),
    ui: {
      editor: draft.ui.editor ?? null,
      showTypePicker: draft.ui.showTypePicker ?? false,
      phase: draft.ui.phase ?? 'editing',
    },
    meta: {
      ...draft.meta,
      version: SUBMISSION_DRAFT_SCHEMA_VERSION,
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
