import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { PanelHeader } from '@/components/shared/PanelHeader'
import { Button } from '@/components/ui'
import { useResourceDetail } from '@/hooks/useResourceDetail'
import { useWorkspaceNavigation } from '@/features/discover/providers/WorkspaceNavigationProvider'
import { submitCreateSubmissionRequest, toHumanErrorMessage } from '@/services/submissionService'
import { cn } from '@/utils/cn'
import type { ResourceVersionDto } from '@/types/resource'
import type {
  ContributorInfo,
  ExistingResourceData,
  SavedContributionPayload,
} from '@/types/submission'
import { ContributorEditor } from '../contributor/ContributorEditor'
import { createEmptyContributorInfo } from '../contributor/emptyState'
import { isContributorComplete } from '../contributor/validation'
import { ExistingResourceEditor } from '../existingResource/ExistingResourceEditor'
import { UnsavedChangesDialog } from '../form/UnsavedChangesDialog'
import { mapUpdateResourceRequest } from '../mappers/mapExistingResource'
import { mapResourceVersionToExistingResourceData } from './mapResourceVersionToExistingResourceData'
import { UpdateRequestSuccessPanel } from './UpdateRequestSuccessPanel'
import { UpdateSectionNav } from './UpdateSectionNav'
import { UpdateSectionPicker } from './UpdateSectionPicker'
import {
  resolveUpdateSubmissionOutcome,
  type UpdateSubmissionOutcome,
} from './resolveUpdateSubmissionOutcome'
import { hasResourceDataChanges } from './updateSectionDiff'
import type { UpdateSectionId } from './updateSections'

/**
 * Update workspace stages. No contributor-facing review —
 * comparison UI remains available for staff moderation.
 */
type UpdateRequestWorkspaceStep = 'picker' | 'editing' | 'success'

interface UpdateRequestWorkspaceProps {
  onClose: () => void
}

/**
 * Shared Update Resource workflow for public and staff contributors.
 * Same form, same submission path; success copy follows backend outcome.
 *
 * TODO(update-resource): Backend will auto-approve authenticated staff
 * submissions and return moderation_status. Success already branches via
 * {@link resolveUpdateSubmissionOutcome} — no parallel staff edit flow.
 *
 * TODO(update-resource): Rename to UpdateResourceWorkspace when aligning
 * internal names with product terminology.
 */
export function UpdateRequestWorkspace({ onClose }: UpdateRequestWorkspaceProps) {
  const { selectedResourceId } = useWorkspaceNavigation()
  const resourceIdNumber = selectedResourceId ? Number(selectedResourceId) : NaN
  const hasResourceId = Number.isFinite(resourceIdNumber)

  const { resource, isLoading, error } = useResourceDetail(selectedResourceId)
  const version: ResourceVersionDto | null = resource?.version ?? null
  const resourceName = version?.name?.trim() || undefined

  const [step, setStep] = useState<UpdateRequestWorkspaceStep>('picker')
  const [selectedSections, setSelectedSections] = useState<UpdateSectionId[]>(
    [],
  )
  const [baselineData, setBaselineData] = useState<ExistingResourceData | null>(
    null,
  )
  const [proposedData, setProposedData] = useState<ExistingResourceData | null>(
    null,
  )
  const [editorKey, setEditorKey] = useState(0)
  const [showResourceErrors, setShowResourceErrors] = useState(false)
  const [showContributorErrors, setShowContributorErrors] = useState(false)
  const [resourceDirty, setResourceDirty] = useState(false)
  const [contributorDirty, setContributorDirty] = useState(false)
  const [updateState, setUpdateState] = useState<{
    hasChanges: boolean
    isComplete: boolean
    editedSections: UpdateSectionId[]
  }>({ hasChanges: false, isComplete: false, editedSections: [] })
  const [contributorComplete, setContributorComplete] = useState(false)
  const [consent, setConsent] = useState(false)
  const [showConsentError, setShowConsentError] = useState(false)
  const [submitHint, setSubmitHint] = useState<string | undefined>()
  const [submitError, setSubmitError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)
  const [successOutcome, setSuccessOutcome] =
    useState<UpdateSubmissionOutcome>('pending_review')
  const [activeSectionId, setActiveSectionId] = useState<UpdateSectionId | null>(
    null,
  )

  const resourceSaveRef = useRef<(() => SavedContributionPayload | null) | null>(
    null,
  )
  const contributorSaveRef = useRef<(() => ContributorInfo | null) | null>(null)
  const submitAbortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const consentId = useId()
  const consentErrorId = useId()

  const isDirty = resourceDirty || contributorDirty

  const resetWorkflow = useCallback(() => {
    submitAbortRef.current?.abort()
    submitAbortRef.current = null
    setIsSubmitting(false)
    setStep('picker')
    setSelectedSections([])
    setBaselineData(null)
    setProposedData(null)
    setShowResourceErrors(false)
    setShowContributorErrors(false)
    setResourceDirty(false)
    setContributorDirty(false)
    setUpdateState({
      hasChanges: false,
      isComplete: false,
      editedSections: [],
    })
    setContributorComplete(false)
    setConsent(false)
    setShowConsentError(false)
    setSubmitHint(undefined)
    setSubmitError(undefined)
    setSuccessOutcome('pending_review')
    setActiveSectionId(null)
    setPendingClose(false)
  }, [])

  // Abort in-flight submit if the workspace unmounts.
  useEffect(() => {
    return () => {
      submitAbortRef.current?.abort()
    }
  }, [])

  // Reset when the selected resource changes.
  useEffect(() => {
    resetWorkflow()
  }, [selectedResourceId, resetWorkflow])

  const requestClose = useCallback(() => {
    if (isSubmitting) return
    const hasEdits =
      step === 'editing' && (isDirty || updateState.hasChanges)
    if (hasEdits) {
      setPendingClose(true)
      return
    }
    resetWorkflow()
    onClose()
  }, [
    isSubmitting,
    step,
    isDirty,
    updateState.hasChanges,
    onClose,
    resetWorkflow,
  ])

  const confirmClose = useCallback(() => {
    if (isSubmitting) return
    setPendingClose(false)
    resetWorkflow()
    onClose()
  }, [isSubmitting, onClose, resetWorkflow])

  // Escape dismisses via the same unsaved-changes path as the header X.
  // While submitting, swallow Escape so navigation cannot interrupt the request.
  // While the discard dialog is open, still swallow Escape so Discover nav
  // cannot pop Resource Detail underneath (and silently discard the draft).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      if (isSubmitting) return
      if (pendingClose) {
        setPendingClose(false)
        return
      }
      requestClose()
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [requestClose, pendingClose, isSubmitting])

  // Close when leaving resource detail after a resource was selected.
  // Stay open when launched with no selection (e.g. dashboard quick action)
  // so staff can search Discover and pick a resource to update.
  const hadSelectedResourceRef = useRef(false)
  useEffect(() => {
    if (selectedResourceId) {
      hadSelectedResourceRef.current = true
      return
    }
    if (!hadSelectedResourceRef.current) return
    resetWorkflow()
    onClose()
  }, [selectedResourceId, resetWorkflow, onClose])

  const goToEditor = useCallback(() => {
    if (!version || selectedSections.length === 0) return
    const mapped = mapResourceVersionToExistingResourceData(version)
    setBaselineData(mapped)
    setProposedData(mapped)
    setEditorKey((value) => value + 1)
    setShowResourceErrors(false)
    setShowContributorErrors(false)
    setResourceDirty(false)
    setContributorDirty(false)
    setUpdateState({
      hasChanges: false,
      isComplete: false,
      editedSections: [],
    })
    setContributorComplete(false)
    setConsent(false)
    setShowConsentError(false)
    setSubmitHint(undefined)
    setSubmitError(undefined)
    setStep('editing')
  }, [version, selectedSections])

  const scrollToSection = useCallback((sectionId: UpdateSectionId) => {
    setActiveSectionId(sectionId)
    const target = document.getElementById(`update-${sectionId}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleUpdateStateChange = useCallback(
    (state: {
      data: ExistingResourceData
      hasChanges: boolean
      editedSections: UpdateSectionId[]
      isComplete: boolean
    }) => {
      setUpdateState({
        hasChanges: state.hasChanges,
        isComplete: state.isComplete,
        editedSections: state.editedSections,
      })
      setProposedData(state.data)
    },
    [],
  )

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return
    if (!baselineData || !proposedData || !hasResourceId) return

    setShowResourceErrors(true)
    setShowContributorErrors(true)

    const savedResource = resourceSaveRef.current?.() ?? null
    const savedContributor = contributorSaveRef.current?.() ?? null

    const resourceOk = hasResourceDataChanges(baselineData, proposedData)
    const contributorOk = isContributorComplete(
      savedContributor ?? createEmptyContributorInfo(),
      { requireResourceConnection: true },
    )

    if (!resourceOk) {
      setSubmitError(undefined)
      setSubmitHint('Make at least one change before submitting.')
      return
    }
    if (!savedResource || !updateState.isComplete) {
      setSubmitError(undefined)
      setSubmitHint('Fix the highlighted resource fields before submitting.')
      return
    }
    if (!savedContributor || !contributorOk || !contributorComplete) {
      setSubmitError(undefined)
      setSubmitHint('Complete your contact information before submitting.')
      document
        .getElementById('contributor-details')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (!consent) {
      setShowConsentError(true)
      setSubmitError(undefined)
      setSubmitHint('Confirm the information is accurate before submitting.')
      return
    }

    const payload = mapUpdateResourceRequest(
      resourceIdNumber,
      proposedData,
      savedContributor,
      proposedData.name || resourceName,
    )

    const displayTitle =
      proposedData.name.trim() || resourceName || 'this resource'
    const controller = new AbortController()
    submitAbortRef.current = controller
    setSubmitHint(undefined)
    setSubmitError(undefined)
    setIsSubmitting(true)

    try {
      const response = await submitCreateSubmissionRequest(payload, {
        signal: controller.signal,
      })
      setResourceDirty(false)
      setContributorDirty(false)
      setSubmitError(undefined)
      setSuccessOutcome(resolveUpdateSubmissionOutcome(response))
      setStep('success')
    } catch (error) {
      // Intentional cancel (unmount / reset) — keep the workspace state as-is.
      if (controller.signal.aborted) return
      if (error instanceof Error && error.name === 'AbortError') return
      setSubmitError(toHumanErrorMessage(error, displayTitle))
    } finally {
      if (submitAbortRef.current === controller) {
        submitAbortRef.current = null
      }
      if (!controller.signal.aborted) {
        setIsSubmitting(false)
      }
    }
  }, [
    isSubmitting,
    baselineData,
    proposedData,
    hasResourceId,
    resourceIdNumber,
    resourceName,
    updateState.isComplete,
    contributorComplete,
    consent,
  ])

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <PanelHeader
        title={
          <h2 className="font-heading text-base font-semibold text-foreground">
            Update Resource
          </h2>
        }
        subtitle={
          resourceName ? (
            <p className="truncate text-xs text-muted-foreground">
              {resourceName}
            </p>
          ) : undefined
        }
        trailing={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={requestClose}
            disabled={isSubmitting}
            aria-label="Close Update Resource workspace"
            title="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        }
      />

      {step === 'editing' ? (
        <UpdateSectionNav
          editedSections={updateState.editedSections}
          activeSectionId={activeSectionId}
          onSelect={scrollToSection}
        />
      ) : null}

      <div
        ref={scrollRef}
        className="workspace-content flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin"
      >
        {step === 'picker' ? (
          <PickerStage
            isLoading={isLoading}
            error={error}
            hasResource={hasResourceId && Boolean(version)}
            resourceName={resourceName}
            selectedSections={selectedSections}
            onSelectedSectionsChange={setSelectedSections}
            onContinue={goToEditor}
          />
        ) : null}

        {step === 'editing' && baselineData && proposedData ? (
          <EditingStage
            editorKey={editorKey}
            baselineData={baselineData}
            proposedData={proposedData}
            initialExpandedSections={selectedSections}
            showResourceErrors={showResourceErrors}
            showContributorErrors={showContributorErrors}
            consent={consent}
            showConsentError={showConsentError}
            consentId={consentId}
            consentErrorId={consentErrorId}
            submitHint={submitHint}
            submitError={submitError}
            canSubmit={updateState.hasChanges}
            isSubmitting={isSubmitting}
            onShowResourceErrorsChange={setShowResourceErrors}
            onShowContributorErrorsChange={setShowContributorErrors}
            onResourceDirtyChange={setResourceDirty}
            onContributorDirtyChange={setContributorDirty}
            onContributorValidityChange={setContributorComplete}
            onRegisterResourceSave={(save) => {
              resourceSaveRef.current = save
            }}
            onRegisterContributorSave={(save) => {
              contributorSaveRef.current = save
            }}
            onUpdateStateChange={handleUpdateStateChange}
            onConsentChange={(value) => {
              setConsent(value)
              if (value) setShowConsentError(false)
            }}
            onSubmit={() => {
              void handleSubmit()
            }}
          />
        ) : null}

        {step === 'success' ? (
          <UpdateRequestSuccessPanel
            outcome={successOutcome}
            onDone={() => {
              resetWorkflow()
              onClose()
            }}
          />
        ) : null}
      </div>

      <UnsavedChangesDialog
        open={pendingClose && !isSubmitting}
        onStay={() => setPendingClose(false)}
        onDiscard={confirmClose}
      />
    </div>
  )
}

function PickerStage({
  isLoading,
  error,
  hasResource,
  resourceName,
  selectedSections,
  onSelectedSectionsChange,
  onContinue,
}: {
  isLoading: boolean
  error: string | null
  hasResource: boolean
  resourceName?: string
  selectedSections: UpdateSectionId[]
  onSelectedSectionsChange: (value: UpdateSectionId[]) => void
  onContinue: () => void
}) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading resource…
      </p>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-danger" role="alert">
        {error}
      </p>
    )
  }

  if (!hasResource) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Select a resource to update.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {resourceName ? (
        <p className="text-sm text-muted-foreground">
          Suggest changes to{' '}
          <span className="font-medium text-foreground">{resourceName}</span>.
        </p>
      ) : null}

      <UpdateSectionPicker
        value={selectedSections}
        onChange={onSelectedSectionsChange}
      />

      <div className="flex flex-col gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="primary"
          disabled={selectedSections.length === 0}
          onClick={onContinue}
        >
          Continue
        </Button>
        {selectedSections.length === 0 ? (
          <p className="text-xs text-muted-foreground sm:order-first sm:mr-auto">
            Select at least one section to continue.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function EditingStage({
  editorKey,
  baselineData,
  proposedData,
  initialExpandedSections,
  showResourceErrors,
  showContributorErrors,
  consent,
  showConsentError,
  consentId,
  consentErrorId,
  submitHint,
  submitError,
  canSubmit,
  isSubmitting,
  onShowResourceErrorsChange,
  onShowContributorErrorsChange,
  onResourceDirtyChange,
  onContributorDirtyChange,
  onContributorValidityChange,
  onRegisterResourceSave,
  onRegisterContributorSave,
  onUpdateStateChange,
  onConsentChange,
  onSubmit,
}: {
  editorKey: number
  baselineData: ExistingResourceData
  proposedData: ExistingResourceData
  initialExpandedSections: UpdateSectionId[]
  showResourceErrors: boolean
  showContributorErrors: boolean
  consent: boolean
  showConsentError: boolean
  consentId: string
  consentErrorId: string
  submitHint?: string
  submitError?: string
  canSubmit: boolean
  isSubmitting: boolean
  onShowResourceErrorsChange: (show: boolean) => void
  onShowContributorErrorsChange: (show: boolean) => void
  onResourceDirtyChange: (dirty: boolean) => void
  onContributorDirtyChange: (dirty: boolean) => void
  onContributorValidityChange: (complete: boolean) => void
  onRegisterResourceSave: (
    save: () => SavedContributionPayload | null,
  ) => void
  onRegisterContributorSave: (save: () => ContributorInfo | null) => void
  onUpdateStateChange: (state: {
    data: ExistingResourceData
    hasChanges: boolean
    editedSections: UpdateSectionId[]
    isComplete: boolean
  }) => void
  onConsentChange: (value: boolean) => void
  onSubmit: () => void
}) {
  // Freeze mount snapshot so live proposedData updates do not re-feed initialData.
  const [initialData] = useState(proposedData)

  return (
    <div className="space-y-8 pb-8">
      <ExistingResourceEditor
        key={`resource-${editorKey}`}
        mode="update"
        initialContribution={null}
        initialData={initialData}
        updateBaseline={baselineData}
        initialExpandedSections={initialExpandedSections}
        showErrors={showResourceErrors}
        onShowErrorsChange={onShowResourceErrorsChange}
        onDirtyChange={onResourceDirtyChange}
        onRegisterSave={onRegisterResourceSave}
        onUpdateStateChange={onUpdateStateChange}
      />

      <ContributorEditor
        key={`contributor-${editorKey}`}
        initialContributor={createEmptyContributorInfo()}
        showErrors={showContributorErrors}
        onShowErrorsChange={onShowContributorErrorsChange}
        onDirtyChange={onContributorDirtyChange}
        onValidityChange={onContributorValidityChange}
        onRegisterSave={onRegisterContributorSave}
        requireResourceConnection
      />

      <section
        aria-labelledby="update-consent-heading"
        className="space-y-3 border-t border-border pt-6"
      >
        <h3
          id="update-consent-heading"
          className="font-heading text-base font-semibold text-foreground"
        >
          Confirmation
        </h3>
        <label
          htmlFor={consentId}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors',
            consent
              ? 'border-interactive bg-interactive-muted'
              : 'border-border hover:border-interactive/50',
            'focus-within:ring-2 focus-within:ring-interactive/40',
            showConsentError && !consent ? 'border-destructive' : null,
          )}
        >
          <input
            id={consentId}
            type="checkbox"
            checked={consent}
            disabled={isSubmitting}
            onChange={(event) => onConsentChange(event.target.checked)}
            aria-invalid={showConsentError && !consent ? true : undefined}
            aria-describedby={
              showConsentError && !consent ? consentErrorId : undefined
            }
            className="mt-0.5 rounded border-border"
          />
          <span className="leading-relaxed text-foreground">
            I confirm that the information provided is accurate to the best of
            my knowledge.
          </span>
        </label>
        {showConsentError && !consent ? (
          <p
            id={consentErrorId}
            role="alert"
            className="text-sm text-destructive"
          >
            Confirm the information is accurate before submitting.
          </p>
        ) : null}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {isSubmitting ? (
          <p className="text-xs text-muted-foreground sm:mr-auto" role="status">
            Submitting…
          </p>
        ) : submitError ? (
          <p className="text-xs text-destructive sm:mr-auto" role="alert">
            {submitError}
          </p>
        ) : submitHint ? (
          <p className="text-xs text-muted-foreground sm:mr-auto" role="status">
            {submitHint}
          </p>
        ) : !canSubmit ? (
          <p className="text-xs text-muted-foreground sm:mr-auto">
            Make at least one change before submitting.
          </p>
        ) : null}
        <Button
          type="button"
          variant="primary"
          disabled={isSubmitting || !canSubmit}
          onClick={onSubmit}
        >
          {isSubmitting ? 'Submitting…' : 'Submit'}
        </Button>
      </div>
    </div>
  )
}
