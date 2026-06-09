import { PageShell } from '@/components/shared/PageShell'
import { RequestResourceUpdatePanel } from '@/features/submissions/RequestResourceUpdatePanel'

export function RequestResourceUpdatePage() {
  return (
    <PageShell
      title="Request Resource Update"
      description="Suggest corrections or updates to an existing community resource listing."
    >
      <RequestResourceUpdatePanel />
    </PageShell>
  )
}
