import { HeroSection } from './components/HeroSection'
import { ContributionBuilder } from './components/ContributionBuilder'
import { DraftRestoreBanner } from './components/DraftRestoreBanner'
import { SubmissionSuccessPanel } from './components/SubmissionSuccessPanel'
import { useSubmissionDraft } from './state/SubmissionDraftProvider'

/**
 * Foundation experience: compact full-width hero → centred contribution choices.
 */
export function SubmitResourceExperience() {
  const {
    draft,
    showRestoreBanner,
    continueDraft,
    discardDraft,
    startNewSubmission,
  } = useSubmissionDraft()

  const isSuccess = draft.ui.phase === 'success'

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
      {!isSuccess && showRestoreBanner ? (
        <div className="page-container pt-4">
          <DraftRestoreBanner
            visible
            onContinue={continueDraft}
            onDiscard={discardDraft}
          />
        </div>
      ) : null}

      {!isSuccess ? <HeroSection /> : null}

      <div className="page-container flex-1 pb-16 pt-10 sm:pb-20 sm:pt-14">
        {isSuccess ? (
          <SubmissionSuccessPanel onSubmitAnother={startNewSubmission} />
        ) : (
          <ContributionBuilder />
        )}
      </div>
    </div>
  )
}
