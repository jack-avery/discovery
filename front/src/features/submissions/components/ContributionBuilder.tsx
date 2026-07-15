import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowRight, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import type {
  ContributorInfo,
  SavedContributionPayload,
} from '@/types/submission'
import { ContributionCard } from './ContributionCard'
import { ContributionTypePicker } from './ContributionTypePicker'
import { ContributionEditorSheet } from './ContributionEditorSheet'
import { UnsavedChangesDialog } from '../form/UnsavedChangesDialog'
import { SectionProgressIndicator } from '../form/SectionProgressIndicator'
import { ExistingResourceEditor } from '../existingResource/ExistingResourceEditor'
import { SkillsServicesEditor } from '../skillsServices/SkillsServicesEditor'
import { EventEditor } from '../event/EventEditor'
import { ContributorEditor } from '../contributor/ContributorEditor'
import { ContributorSummaryCard } from '../contributor/ContributorSummaryCard'
import { isContributorComplete } from '../contributor/validation'
import { ReviewSubmissionPanel } from '../review/ReviewSubmissionPanel'
import {
  buildSubmissionSummary,
  canOpenReview,
  getReviewBlockers,
  isConsentComplete,
} from '../review/buildSubmissionSummary'
import { SubmissionOutcomePanel } from './SubmissionOutcomePanel'
import { useSubmissionDraft } from '../state/SubmissionDraftProvider'
import { CONTRIBUTION_TYPE_META } from '../constants/contributionTypes'
import {
  canAddContribution,
  CONTRIBUTION_LIMIT_REACHED_MESSAGE,
  contributionCountLabel,
  isContributionLimitReached,
} from '../constants/contributionLimits'
import {
  submitSubmission,
  SubmissionValidationError,
  type ContributionSubmitFailure,
  type ContributionSubmitSuccess,
} from '@/services/submissionService'

type SaveHandler = () => SavedContributionPayload | null
type ContributorSaveHandler = () => ContributorInfo | null

type EditorProgress = {
  sections: readonly string[]
  revealed: number
  labelBreakpoint?: 'sm' | 'lg'
} | null

const ADD_ANOTHER_BUTTON_ID = 'add-another-contribution'
const NEXT_ACTION_BUTTON_ID = 'contribution-next-action'

export function ContributionBuilder() {
  const {
    draft,
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
    setConsent,
    retainFailedContributions,
    completeSuccessfulSubmission,
  } = useSubmissionDraft()

  const { contributions, ui, contributor, consent } = draft
  const isEmpty = contributions.length === 0
  const atLimit = isContributionLimitReached(contributions.length)
  const canAdd = canAddContribution(contributions.length)
  const showTypePicker = canAdd && (isEmpty || ui.showTypePicker)
  const editor = ui.editor
  const editorMeta = editor ? CONTRIBUTION_TYPE_META[editor.type] : null
  const contributorComplete = isContributorComplete(contributor)
  const reviewReady = canOpenReview(draft)
  const reviewBlockers = useMemo(
    () => (contributorComplete ? getReviewBlockers(draft) : []),
    [contributorComplete, draft],
  )
  const submissionSummary = useMemo(
    () => buildSubmissionSummary(draft),
    [draft],
  )

  const contributionSaveRef = useRef<SaveHandler | null>(null)
  const contributorSaveRef = useRef<ContributorSaveHandler | null>(null)
  const previousPickerOpenRef = useRef(false)
  const previousContributionIdsRef = useRef<Set<string>>(new Set())
  const expectNewContributionRef = useRef(false)
  const previousContributorOpenRef = useRef(false)
  const submitAbortRef = useRef<AbortController | null>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const limitMessageId = useId()
  const reviewGateId = useId()

  const [isDirty, setIsDirty] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [editorProgress, setEditorProgress] = useState<EditorProgress>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [showConsentError, setShowConsentError] = useState(false)
  const [showReviewGate, setShowReviewGate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitOutcome, setSubmitOutcome] = useState<{
    kind: 'partial' | 'failure'
    succeeded: ContributionSubmitSuccess[]
    failed: ContributionSubmitFailure[]
  } | null>(null)

  const editingContribution =
    editor?.mode === 'edit' && editor.contributionId
      ? (contributions.find((c) => c.id === editor.contributionId) ?? null)
      : null

  const registerSave = useCallback((handler: SaveHandler) => {
    contributionSaveRef.current = handler
  }, [])

  const registerContributorSave = useCallback(
    (handler: ContributorSaveHandler) => {
      contributorSaveRef.current = handler
    },
    [],
  )

  const handleProgressChange = useCallback((progress: EditorProgress) => {
    setEditorProgress(progress)
  }, [])

  useEffect(() => {
    if (!editor) setEditorProgress(null)
  }, [editor])

  useEffect(() => {
    if (atLimit && editor?.mode === 'create') {
      closeEditor()
    }
  }, [atLimit, editor, closeEditor])

  useEffect(() => {
    const justOpened = showTypePicker && !previousPickerOpenRef.current
    previousPickerOpenRef.current = showTypePicker

    if (!justOpened || isEmpty) return

    window.setTimeout(() => {
      const heading = document.getElementById('contribution-type-picker-heading')
      heading?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      heading?.focus()
    }, 0)
  }, [showTypePicker, isEmpty])

  useEffect(() => {
    if (!expectNewContributionRef.current) return
    const previous = previousContributionIdsRef.current
    const created = contributions.find((c) => !previous.has(c.id))
    if (!created) return

    expectNewContributionRef.current = false
    setStatusMessage(`${created.title} was added to your contributions.`)
    window.setTimeout(() => {
      document
        .getElementById(`contribution-card-title-${created.id}`)
        ?.focus()
    }, 0)
  }, [contributions])

  useEffect(() => {
    const wasOpen = previousContributorOpenRef.current
    previousContributorOpenRef.current = ui.showContributorEditor
    if (wasOpen && !ui.showContributorEditor && contributorComplete) {
      setStatusMessage('Your information was saved.')
      window.setTimeout(() => {
        document.getElementById('contributor-summary-title')?.focus()
      }, 0)
    }
  }, [ui.showContributorEditor, contributorComplete])

  useEffect(() => {
    if (!ui.showReview) {
      setShowConsentError(false)
      if (!isSubmitting) setSubmitOutcome(null)
    }
  }, [ui.showReview, isSubmitting])

  useEffect(() => {
    return () => {
      submitAbortRef.current?.abort()
    }
  }, [])

  const focusAddAnother = () => {
    window.setTimeout(() => {
      document.getElementById(ADD_ANOTHER_BUTTON_ID)?.focus()
    }, 0)
  }

  const focusNextAction = () => {
    window.setTimeout(() => {
      document.getElementById(NEXT_ACTION_BUTTON_ID)?.focus()
    }, 0)
  }

  const requestCloseContribution = () => {
    const wasCreate = editor?.mode === 'create'
    if (isDirty) {
      setConfirmClose(true)
      return
    }
    setShowErrors(false)
    setIsDirty(false)
    setEditorProgress(null)
    closeEditor()
    if (wasCreate && !isEmpty) {
      focusAddAnother()
    }
  }

  const requestCloseContributor = () => {
    if (isDirty) {
      setConfirmClose(true)
      return
    }
    setShowErrors(false)
    setIsDirty(false)
    closeContributorEditor()
    focusNextAction()
  }

  const discardAndClose = () => {
    const wasContributionCreate = editor?.mode === 'create'
    const wasContributor = ui.showContributorEditor
    setConfirmClose(false)
    setShowErrors(false)
    setIsDirty(false)
    setEditorProgress(null)
    if (wasContributor) {
      closeContributorEditor()
      focusNextAction()
      return
    }
    closeEditor()
    if (wasContributionCreate && contributions.length > 0) {
      focusAddAnother()
    }
  }

  const handleCancelPicker = () => {
    closeTypePicker()
    focusAddAnother()
  }

  const handleContributionSave = () => {
    if (
      editor?.type === 'existing_resource' ||
      editor?.type === 'community_asset' ||
      editor?.type === 'event'
    ) {
      const payload = contributionSaveRef.current?.() ?? null
      if (!payload) {
        setShowErrors(true)
        return
      }
      const wasCreate = editor.mode === 'create'
      if (wasCreate) {
        previousContributionIdsRef.current = new Set(
          contributions.map((c) => c.id),
        )
        expectNewContributionRef.current = true
      }
      const accepted = saveEditorContribution(payload)
      setShowErrors(false)
      setIsDirty(false)
      setEditorProgress(null)
      if (wasCreate && !accepted) {
        expectNewContributionRef.current = false
      }
    }
  }

  const handleContributorSave = () => {
    const result = contributorSaveRef.current?.() ?? null
    if (!result) {
      setShowErrors(true)
      return
    }
    saveContributor(result)
    setShowErrors(false)
    setIsDirty(false)
  }

  const handleRemove = (id: string) => {
    const wasAtLimit = atLimit
    removeContribution(id)
    if (wasAtLimit) {
      focusAddAnother()
    }
  }

  const handleNextAction = () => {
    if (!contributorComplete) {
      setShowReviewGate(false)
      setIsDirty(false)
      setShowErrors(false)
      openContributorEditor()
      return
    }

    if (!reviewReady) {
      setShowReviewGate(true)
      setStatusMessage(
        'Finish incomplete items before reviewing your submission.',
      )
      return
    }

    setShowReviewGate(false)
    setShowConsentError(false)
    openReview()
  }

  const handleReviewSubmit = async () => {
    if (isSubmitting) return

    if (!isConsentComplete(consent)) {
      setShowConsentError(true)
      return
    }

    setShowConsentError(false)
    setSubmitOutcome(null)
    setIsSubmitting(true)
    setStatusMessage('Submitting your contributions…')

    const controller = new AbortController()
    submitAbortRef.current = controller

    try {
      const result = await submitSubmission(draftRef.current, {
        signal: controller.signal,
      })

      if (result.status === 'success') {
        setStatusMessage('Your contributions were submitted successfully.')
        completeSuccessfulSubmission()
        return
      }

      if (result.status === 'partial') {
        retainFailedContributions(
          result.failed.map((item) => item.contributionId),
        )
        setSubmitOutcome({
          kind: 'partial',
          succeeded: result.succeeded,
          failed: result.failed,
        })
        setStatusMessage(
          'Some contributions were submitted. Unsent items were kept.',
        )
        return
      }

      setSubmitOutcome({
        kind: 'failure',
        succeeded: [],
        failed: result.failed,
      })
      setStatusMessage(
        'We could not submit your contributions. Your draft was kept.',
      )
    } catch (error) {
      if (error instanceof SubmissionValidationError) {
        setShowConsentError(true)
        setStatusMessage(error.blockers[0] ?? error.message)
        return
      }

      setSubmitOutcome({
        kind: 'failure',
        succeeded: [],
        failed: [
          {
            contributionId: 'batch',
            title: 'Your submission',
            message:
              'We couldn’t submit your contributions right now. Your information has been saved in this browser so you can try again.',
          },
        ],
      })
      setStatusMessage(
        'We could not submit your contributions. Your draft was kept.',
      )
    } finally {
      setIsSubmitting(false)
      submitAbortRef.current = null
    }
  }

  const handleRetryFailed = async () => {
    if (isSubmitting) return
    setSubmitOutcome(null)
    await handleReviewSubmit()
  }

  const dismissSubmitOutcome = () => {
    setSubmitOutcome(null)
    closeReview()
    focusNextAction()
  }

  const editorDescription =
    editor?.type === 'existing_resource'
      ? 'Tell us about an organization, program, service, or place that people can already access in the Rideau-Rockcliffe community.'
      : editor?.type === 'community_asset'
        ? 'Tell us about something you would personally like to offer to the Rideau-Rockcliffe community.'
        : editor?.type === 'event'
          ? 'Tell us about an upcoming one-time or recurring event that could benefit people in the Rideau-Rockcliffe community.'
          : undefined

  const progressNode = editorProgress ? (
    <SectionProgressIndicator
      sections={editorProgress.sections}
      revealed={editorProgress.revealed}
      labelBreakpoint={editorProgress.labelBreakpoint}
    />
  ) : null

  const nextActionLabel = contributorComplete
    ? 'Next: Review & Submit'
    : 'Next: Your information'

  return (
    <section
      aria-labelledby={
        showTypePicker && isEmpty
          ? 'contribution-type-picker-heading'
          : !isEmpty
            ? 'contribution-builder-heading'
            : 'contribution-type-picker-heading'
      }
      className="space-y-10"
    >
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      {restoreNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="mx-auto w-full max-w-3xl rounded-xl border border-border-subtle bg-muted px-4 py-3 text-sm text-muted-foreground"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p>{restoreNotice}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearRestoreNotice}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      {/*
        Order when contributions exist:
        heading → supporting copy → count →
        primary actions → contributor summary → type picker → saved cards
      */}
      {!isEmpty ? (
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <div className="space-y-1 text-center sm:text-left">
            <h2
              id="contribution-builder-heading"
              tabIndex={-1}
              className="font-heading text-xl font-semibold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
            >
              Your Contributions
            </h2>
            <p className="text-sm text-muted-foreground">
              Review what you&apos;ve added. You can edit or remove items before
              submitting.
            </p>
            <p className="text-xs text-muted-foreground">
              {contributionCountLabel(contributions.length)}
            </p>
          </div>

          {!ui.showTypePicker ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {canAdd ? (
                <Button
                  id={ADD_ANOTHER_BUTTON_ID}
                  type="button"
                  variant="interactive"
                  onClick={openTypePicker}
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Add another contribution
                </Button>
              ) : null}
              <Button
                id={NEXT_ACTION_BUTTON_ID}
                type="button"
                variant="primary"
                onClick={handleNextAction}
                className="w-full sm:w-auto"
                disabled={isSubmitting}
                aria-describedby={
                  showReviewGate && !reviewReady ? reviewGateId : undefined
                }
              >
                {nextActionLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ) : null}

          {atLimit ? (
            <div
              id={limitMessageId}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="rounded-xl border border-border-subtle bg-muted px-4 py-3 text-sm leading-relaxed text-foreground"
            >
              {CONTRIBUTION_LIMIT_REACHED_MESSAGE}
            </div>
          ) : null}

          {showReviewGate && !reviewReady ? (
            <div
              id={reviewGateId}
              role="alert"
              className="rounded-xl border border-border-subtle bg-muted px-4 py-3 text-sm text-foreground"
            >
              <p className="font-medium">A few things still need attention:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {reviewBlockers.map((blocker) => (
                  <li key={`${blocker.kind}-${'contributionId' in blocker ? blocker.contributionId : 'contributor'}`}>
                    {'contributionId' in blocker ? (
                      <button
                        type="button"
                        className="text-left text-interactive underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
                        onClick={() =>
                          beginEditContribution(blocker.contributionId)
                        }
                      >
                        {blocker.message}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-left text-interactive underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
                        onClick={() => openContributorEditor()}
                      >
                        {blocker.message}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {contributorComplete ? (
            <ContributorSummaryCard
              contributor={contributor}
              onEdit={() => {
                if (isSubmitting) return
                setIsDirty(false)
                setShowErrors(false)
                openContributorEditor()
              }}
            />
          ) : null}
        </div>
      ) : null}

      {showTypePicker ? (
        <ContributionTypePicker
          visible
          showCancel={!isEmpty && ui.showTypePicker}
          onCancel={handleCancelPicker}
          onSelect={beginCreateContribution}
        />
      ) : null}

      {!isEmpty ? (
        <div className="mx-auto w-full max-w-3xl">
          <ul className="space-y-3 text-left">
            {contributions.map((contribution) => (
              <li key={contribution.id}>
                <ContributionCard
                  contribution={contribution}
                  onEdit={() => beginEditContribution(contribution.id)}
                  onDelete={() => handleRemove(contribution.id)}
                  actionsDisabled={isSubmitting}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ContributionEditorSheet
        open={editor !== null}
        title={
          editorMeta
            ? editor?.mode === 'edit'
              ? `Edit ${editorMeta.label}`
              : editorMeta.label
            : 'Contribution'
        }
        description={editorDescription}
        progress={progressNode}
        onClose={requestCloseContribution}
        onSave={handleContributionSave}
        saveLabel={
          editor?.mode === 'edit' ? 'Save changes' : 'Save Contribution'
        }
      >
        {editor?.type === 'existing_resource' ? (
          <ExistingResourceEditor
            key={editor.contributionId ?? `new-${editor.mode}`}
            initialContribution={editingContribution}
            showErrors={showErrors}
            onShowErrorsChange={setShowErrors}
            onDirtyChange={setIsDirty}
            onRegisterSave={registerSave}
            onProgressChange={handleProgressChange}
          />
        ) : editor?.type === 'community_asset' ? (
          <SkillsServicesEditor
            key={editor.contributionId ?? `new-${editor.mode}`}
            initialContribution={editingContribution}
            showErrors={showErrors}
            onShowErrorsChange={setShowErrors}
            onDirtyChange={setIsDirty}
            onRegisterSave={registerSave}
            onProgressChange={handleProgressChange}
          />
        ) : editor?.type === 'event' ? (
          <EventEditor
            key={editor.contributionId ?? `new-${editor.mode}`}
            initialContribution={editingContribution}
            showErrors={showErrors}
            onShowErrorsChange={setShowErrors}
            onDirtyChange={setIsDirty}
            onRegisterSave={registerSave}
            onProgressChange={handleProgressChange}
          />
        ) : null}
      </ContributionEditorSheet>

      <ContributionEditorSheet
        open={ui.showContributorEditor}
        title="Your Information"
        description="Tell us how RRCRC can contact you if we need to clarify anything about your submission."
        onClose={requestCloseContributor}
        onSave={handleContributorSave}
        saveLabel="Save your information"
      >
        {ui.showContributorEditor ? (
          <ContributorEditor
            key={`contributor-${contributor.name}-${contributor.email}`}
            initialContributor={contributor}
            showErrors={showErrors}
            onShowErrorsChange={setShowErrors}
            onDirtyChange={setIsDirty}
            onRegisterSave={registerContributorSave}
          />
        ) : null}
      </ContributionEditorSheet>

      <ContributionEditorSheet
        open={ui.showReview}
        title={
          submitOutcome
            ? submitOutcome.kind === 'partial'
              ? 'Submission update'
              : 'Submission could not be completed'
            : 'Review your submission'
        }
        description={
          submitOutcome
            ? undefined
            : isSubmitting
              ? 'Please wait while we send your contributions to RRCRC.'
              : 'Check the information below before submitting it to RRCRC.'
        }
        onClose={() => {
          if (isSubmitting) return
          if (submitOutcome) {
            dismissSubmitOutcome()
            return
          }
          setShowConsentError(false)
          closeReview()
          focusNextAction()
        }}
        cancelLabel={submitOutcome ? 'Close' : 'Back'}
        onSave={
          submitOutcome
            ? undefined
            : () => {
                void handleReviewSubmit()
              }
        }
        hidePrimary={Boolean(submitOutcome)}
        primaryDisabled={isSubmitting}
        saveLabel={
          isSubmitting ? 'Submitting your contributions…' : 'Submit Contributions'
        }
      >
        {submitOutcome ? (
          <SubmissionOutcomePanel
            kind={submitOutcome.kind}
            succeeded={submitOutcome.succeeded}
            failed={submitOutcome.failed}
            onRetryFailed={() => {
              void handleRetryFailed()
            }}
            onDismiss={dismissSubmitOutcome}
            retrying={isSubmitting}
          />
        ) : (
          <ReviewSubmissionPanel
            summary={submissionSummary}
            consent={consent}
            showConsentError={showConsentError}
            consentDisabled={isSubmitting}
            onConsentChange={(value) => {
              if (isSubmitting) return
              setConsent(value)
              if (value) setShowConsentError(false)
            }}
          />
        )}
      </ContributionEditorSheet>

      <UnsavedChangesDialog
        open={confirmClose}
        onStay={() => setConfirmClose(false)}
        onDiscard={discardAndClose}
      />
    </section>
  )
}
