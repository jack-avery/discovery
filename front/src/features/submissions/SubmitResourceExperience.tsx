import { HeroSection } from './components/HeroSection'
import { ContributionBuilder } from './components/ContributionBuilder'
import { DraftRestoreBanner } from './components/DraftRestoreBanner'
import { useSubmissionDraft } from './state/SubmissionDraftProvider'

/**
 * Foundation experience: compact full-width hero → centred contribution choices.
 */
export function SubmitResourceExperience() {
  const { showRestoreBanner, continueDraft, discardDraft } = useSubmissionDraft()

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
      {showRestoreBanner ? (
        <div className="page-container pt-4">
          <DraftRestoreBanner
            visible
            onContinue={continueDraft}
            onDiscard={discardDraft}
          />
        </div>
      ) : null}

      <HeroSection />

      <div className="page-container flex-1 pb-16 pt-10 sm:pb-20 sm:pt-14">
        <ContributionBuilder />
      </div>
    </div>
  )
}
