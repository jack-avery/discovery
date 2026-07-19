import { useCallback, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import { WorkspaceSection } from '@/features/discover/WorkspaceSection'
import type { ResourceVersionDto } from '@/types/resource'
import type {
  ContributorInfo,
  ExistingResourceData,
  SavedContributionPayload,
} from '@/types/submission'
import { ContributionEditorSheet } from '../components/ContributionEditorSheet'
import { ContributorEditor } from '../contributor/ContributorEditor'
import { createEmptyContributorInfo } from '../contributor/emptyState'
import { isContributorComplete } from '../contributor/validation'
import { ExistingResourceEditor } from '../existingResource/ExistingResourceEditor'
import { isExistingResourceData } from '../existingResource/emptyState'
import { UnsavedChangesDialog } from '../form/UnsavedChangesDialog'
import { mapUpdateResourceRequest } from '../mappers/mapExistingResource'
import { mapResourceVersionToExistingResourceData } from './mapResourceToExistingResourceData'
import { ReviewResourceUpdatePanel } from './ReviewResourceUpdatePanel'
import { UpdateRequestSuccessPanel } from './UpdateRequestSuccessPanel'
import { UpdateSectionPicker } from './UpdateSectionPicker'
import { hasResourceDataChanges } from './updateSectionDiff'
import type { UpdateSectionId } from './updateSections'

type FlowStep = 'closed' | 'picker' | 'editor' | 'review' | 'success'
type PendingLeave = 'close' | 'picker' | null

interface RequestResourceUpdateFlowProps {
  resourceId: number
  resourceName?: string
  /** Approved version used to prefill the update editor. */
  version: ResourceVersionDto
}

/**
 * Public update request: detail CTA → section picker → editor → review → success.
 * Backend submit arrives in Milestone 4.
 */
export function RequestResourceUpdateFlow({
  resourceId,
  resourceName,
  version,
}: RequestResourceUpdateFlowProps) {
  const [step, setStep] = useState<FlowStep>('closed')
  const [selectedSections, setSelectedSections] = useState<UpdateSectionId[]>(
    [],
  )
  const [expandedSections, setExpandedSections] = useState<UpdateSectionId[]>(
    [],
  )
  /** Original mapped resource — immutable change-detection baseline. */
  const [baselineData, setBaselineData] = useState<ExistingResourceData | null>(
    null,
  )
  /** Latest proposed resource data (editor working copy / review snapshot). */
  const [proposedData, setProposedData] = useState<ExistingResourceData | null>(
    null,
  )
  const [contributor, setContributor] = useState<ContributorInfo>(() =>
    createEmptyContributorInfo(),
  )
  const [editorKey, setEditorKey] = useState(0)
  const [showResourceErrors, setShowResourceErrors] = useState(false)
  const [showContributorErrors, setShowContributorErrors] = useState(false)
  const [resourceDirty, setResourceDirty] = useState(false)
  const [contributorDirty, setContributorDirty] = useState(false)
  const [pendingLeave, setPendingLeave] = useState<PendingLeave>(null)
  const [updateState, setUpdateState] = useState<{
    hasChanges: boolean
    isComplete: boolean
  }>({ hasChanges: false, isComplete: false })
  const [contributorComplete, setContributorComplete] = useState(false)
  const [consent, setConsent] = useState(false)
  const [showConsentError, setShowConsentError] = useState(false)

  const resourceSaveRef = useRef<(() => SavedContributionPayload | null) | null>(
    null,
  )
  const contributorSaveRef = useRef<(() => ContributorInfo | null) | null>(null)

  const isDirty = resourceDirty || contributorDirty

  const resetAndClose = useCallback(() => {
    setStep('closed')
    setSelectedSections([])
    setExpandedSections([])
    setBaselineData(null)
    setProposedData(null)
    setContributor(createEmptyContributorInfo())
    setShowResourceErrors(false)
    setShowContributorErrors(false)
    setResourceDirty(false)
    setContributorDirty(false)
    setPendingLeave(null)
    setUpdateState({ hasChanges: false, isComplete: false })
    setContributorComplete(false)
    setConsent(false)
    setShowConsentError(false)
  }, [])

  const openPicker = useCallback(() => {
    setSelectedSections([])
    setExpandedSections([])
    setBaselineData(null)
    setProposedData(null)
    setContributor(createEmptyContributorInfo())
    setShowResourceErrors(false)
    setShowContributorErrors(false)
    setResourceDirty(false)
    setContributorDirty(false)
    setUpdateState({ hasChanges: false, isComplete: false })
    setContributorComplete(false)
    setConsent(false)
    setShowConsentError(false)
    setStep('picker')
  }, [])

  const requestClose = useCallback(() => {
    if (step === 'success') {
      resetAndClose()
      return
    }
    if ((step === 'editor' || step === 'review') && isDirty) {
      setPendingLeave('close')
      return
    }
    if (step === 'review') {
      // Review holds saved snapshots; closing discards the in-progress request.
      resetAndClose()
      return
    }
    resetAndClose()
  }, [step, isDirty, resetAndClose])

  const goToEditor = useCallback(() => {
    if (selectedSections.length === 0) return
    const mapped = mapResourceVersionToExistingResourceData(version)
    setBaselineData(mapped)
    setProposedData(mapped)
    setExpandedSections(selectedSections)
    setContributor(createEmptyContributorInfo())
    setEditorKey((value) => value + 1)
    setShowResourceErrors(false)
    setShowContributorErrors(false)
    setResourceDirty(false)
    setContributorDirty(false)
    setUpdateState({ hasChanges: false, isComplete: false })
    setContributorComplete(false)
    setConsent(false)
    setShowConsentError(false)
    setStep('editor')
  }, [selectedSections, version])

  const backToPicker = useCallback(() => {
    if (isDirty) {
      setPendingLeave('picker')
      return
    }
    setStep('picker')
    setBaselineData(null)
    setProposedData(null)
  }, [isDirty])

  const continueFromEditor = useCallback(() => {
    setShowResourceErrors(true)
    setShowContributorErrors(true)

    const savedResource = resourceSaveRef.current?.() ?? null
    const savedContributor = contributorSaveRef.current?.() ?? null

    if (!updateState.hasChanges) return
    if (!savedResource || !savedContributor) return
    if (!isExistingResourceData(savedResource.data)) return

    setProposedData(savedResource.data)
    setContributor(savedContributor)
    setConsent(false)
    setShowConsentError(false)
    setResourceDirty(false)
    setContributorDirty(false)
    setStep('review')
  }, [updateState.hasChanges])

  const backToEditor = useCallback(
    (focusSection?: UpdateSectionId) => {
      if (!proposedData || !baselineData) return
      const nextExpanded = focusSection
        ? Array.from(
            new Set([focusSection, ...selectedSections, ...expandedSections]),
          )
        : expandedSections.length > 0
          ? expandedSections
          : selectedSections
      setExpandedSections(nextExpanded)
      setEditorKey((value) => value + 1)
      setShowResourceErrors(false)
      setShowContributorErrors(false)
      setResourceDirty(false)
      setContributorDirty(false)
      setShowConsentError(false)
      setStep('editor')
    },
    [proposedData, baselineData, selectedSections, expandedSections],
  )

  const submitFromReview = useCallback(() => {
    if (!baselineData || !proposedData) return

    const resourceOk = hasResourceDataChanges(baselineData, proposedData)
    const contributorOk = isContributorComplete(contributor, {
      requireResourceConnection: true,
    })

    if (!consent) {
      setShowConsentError(true)
      return
    }
    if (!resourceOk || !contributorOk) {
      setShowConsentError(true)
      return
    }

    const payload = mapUpdateResourceRequest(
      resourceId,
      proposedData,
      contributor,
      proposedData.name || resourceName,
    )

    // Milestone 3: expose payload for inspection; API submit is Milestone 4.
    console.info('[update_resource] prepared payload', payload)

    setStep('success')
  }, [
    baselineData,
    proposedData,
    contributor,
    consent,
    resourceId,
    resourceName,
  ])

  const confirmDiscard = useCallback(() => {
    const leave = pendingLeave
    setPendingLeave(null)
    if (leave === 'picker') {
      setStep('picker')
      setBaselineData(null)
      setProposedData(null)
      setShowResourceErrors(false)
      setShowContributorErrors(false)
      setResourceDirty(false)
      setContributorDirty(false)
      setUpdateState({ hasChanges: false, isComplete: false })
      setContributorComplete(false)
      return
    }
    resetAndClose()
  }, [pendingLeave, resetAndClose])

  const sheetOpen = step !== 'closed'
  const onPicker = step === 'picker'
  const onEditor = step === 'editor'
  const onReview = step === 'review'
  const onSuccess = step === 'success'

  const canContinueFromEditor = updateState.hasChanges

  const primaryHint = useMemo(() => {
    if (onEditor) {
      if (!updateState.hasChanges) {
        return 'Make at least one change before continuing.'
      }
      if (showResourceErrors || showContributorErrors) {
        if (!updateState.isComplete || !contributorComplete) {
          return 'Fix the highlighted fields before continuing.'
        }
      }
      return undefined
    }
    if (onReview && showConsentError && !consent) {
      return 'Confirm the information is accurate before submitting.'
    }
    return undefined
  }, [
    onEditor,
    onReview,
    updateState.hasChanges,
    updateState.isComplete,
    contributorComplete,
    showResourceErrors,
    showContributorErrors,
    showConsentError,
    consent,
  ])

  const title = onPicker
    ? 'Request an update'
    : onEditor
      ? 'Update resource'
      : onReview
        ? 'Review update request'
        : 'Update request ready'

  const description = resourceName
    ? onPicker
      ? `Suggest changes to ${resourceName}.`
      : onEditor
        ? `Editing details for ${resourceName}.`
        : onReview
          ? `Confirm your proposed changes to ${resourceName}.`
          : undefined
    : undefined

  return (
    <>
      <WorkspaceSection
        title="Help keep this information accurate"
        aria-label="Help keep this information accurate"
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Spot something outdated or incomplete? Request an update so our team
            can review the change.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={openPicker}>
            Request an update
          </Button>
        </div>
      </WorkspaceSection>

      <ContributionEditorSheet
        open={sheetOpen}
        title={title}
        description={description}
        onClose={requestClose}
        onCancel={
          onEditor
            ? backToPicker
            : onReview
              ? () => backToEditor()
              : onSuccess
                ? resetAndClose
                : requestClose
        }
        onSave={
          onPicker
            ? goToEditor
            : onEditor
              ? continueFromEditor
              : onReview
                ? submitFromReview
                : undefined
        }
        saveLabel={onReview ? 'Submit' : 'Continue'}
        cancelLabel={onPicker ? 'Cancel' : onSuccess ? 'Close' : 'Back'}
        hidePrimary={onSuccess}
        primaryDisabled={
          onPicker
            ? selectedSections.length === 0
            : onEditor
              ? !canContinueFromEditor
              : false
        }
        primaryHint={primaryHint}
      >
        {onPicker ? (
          <UpdateSectionPicker
            value={selectedSections}
            onChange={setSelectedSections}
          />
        ) : null}

        {onEditor && baselineData && proposedData ? (
          <div className="space-y-8">
            <ExistingResourceEditor
              key={`resource-${editorKey}`}
              mode="update"
              initialContribution={null}
              initialData={proposedData}
              updateBaseline={baselineData}
              initialExpandedSections={expandedSections}
              showErrors={showResourceErrors}
              onShowErrorsChange={setShowResourceErrors}
              onDirtyChange={setResourceDirty}
              onRegisterSave={(save) => {
                resourceSaveRef.current = save
              }}
              onUpdateStateChange={(state) => {
                setUpdateState({
                  hasChanges: state.hasChanges,
                  isComplete: state.isComplete,
                })
              }}
            />

            <ContributorEditor
              key={`contributor-${editorKey}`}
              initialContributor={contributor}
              showErrors={showContributorErrors}
              onShowErrorsChange={setShowContributorErrors}
              onDirtyChange={setContributorDirty}
              onValidityChange={setContributorComplete}
              onRegisterSave={(save) => {
                contributorSaveRef.current = save
              }}
              requireResourceConnection
            />
          </div>
        ) : null}

        {onReview && baselineData && proposedData ? (
          <ReviewResourceUpdatePanel
            baseline={baselineData}
            proposed={proposedData}
            contributor={contributor}
            consent={consent}
            showConsentError={showConsentError}
            onConsentChange={(value) => {
              setConsent(value)
              if (value) setShowConsentError(false)
            }}
            onEditSection={(sectionId) => backToEditor(sectionId)}
          />
        ) : null}

        {onSuccess ? (
          <UpdateRequestSuccessPanel
            resourceName={resourceName}
            onDone={resetAndClose}
          />
        ) : null}
      </ContributionEditorSheet>

      <UnsavedChangesDialog
        open={pendingLeave !== null}
        onStay={() => setPendingLeave(null)}
        onDiscard={confirmDiscard}
      />
    </>
  )
}
