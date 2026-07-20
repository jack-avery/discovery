import { PageShell } from '@/components/shared/PageShell'
import { RequestResourceUpdatePanel } from '@/features/submissions/RequestResourceUpdatePanel'

/**
 * Standalone Update Resource page (legacy route).
 *
 * TODO(update-resource): Prefer the Discover Update Resource workspace;
 * rename this page/route when aligning internal names and URLs.
 */
export function RequestResourceUpdatePage() {
  return (
    <PageShell
      title="Update Resource"
      description="Suggest corrections or improvements to an existing community resource listing."
    >
      <RequestResourceUpdatePanel />
    </PageShell>
  )
}
