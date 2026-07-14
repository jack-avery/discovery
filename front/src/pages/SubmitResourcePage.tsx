import { SubmitResourceExperience } from '@/features/submissions/SubmitResourceExperience'
import { SubmissionDraftProvider } from '@/features/submissions/state/SubmissionDraftProvider'

/**
 * Public Submit Resource page.
 * Hero owns the sole H1 — intentionally no PageShell title.
 */
export function SubmitResourcePage() {
  return (
    <SubmissionDraftProvider>
      <SubmitResourceExperience />
    </SubmissionDraftProvider>
  )
}
