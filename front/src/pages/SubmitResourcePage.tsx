import { PageShell } from '@/components/shared/PageShell'
import { SubmitResourceExperience } from '@/features/submissions/SubmitResourceExperience'
import { SubmissionDraftProvider } from '@/features/submissions/state/SubmissionDraftProvider'

/**
 * Public Contribute Resource page.
 * Uses the shared PageShell header (Sign in / session) identical to Home.
 * Hero content remains full-bleed below the header.
 */
export function SubmitResourcePage() {
  return (
    <SubmissionDraftProvider>
      <PageShell title="Contribute Resource" uncontained>
        <SubmitResourceExperience />
      </PageShell>
    </SubmissionDraftProvider>
  )
}
