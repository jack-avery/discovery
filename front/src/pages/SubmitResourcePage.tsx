import { PageShell } from '@/components/shared/PageShell'
import { SubmitResourcePanel } from '@/features/submissions/SubmitResourcePanel'

export function SubmitResourcePage() {
  return (
    <PageShell
      title="Submit Resource"
      description="Help others discover a community resource in the Rideau-Rockcliffe area."
    >
      <SubmitResourcePanel />
    </PageShell>
  )
}
