import { PageShell } from '@/components/shared/PageShell'

/**
 * Staff dashboard scaffold.
 * Statistic cards and activity content arrive in a later milestone.
 */
export function StaffHomePage() {
  return (
    <PageShell
      title="Dashboard"
      description="Overview of RRCRC community resource activity and moderation work."
    >
      <div className="min-h-[12rem] w-full" aria-hidden="true" />
    </PageShell>
  )
}
