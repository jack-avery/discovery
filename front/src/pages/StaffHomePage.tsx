import { AlertCircle, ClipboardList, FilePenLine, MapPin, TriangleAlert } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { Button } from '@/components/ui'
import {
  DashboardCategoryCard,
  DashboardHeader,
  DashboardQuickActions,
  DashboardRecentSubmissions,
  DashboardStatCard,
  PLACEHOLDER_CATEGORY_SEGMENTS,
  PLACEHOLDER_QUICK_ACTIONS,
  PLACEHOLDER_RECENT_SUBMISSIONS,
  PLACEHOLDER_STATS,
} from '@/features/staff/dashboard'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import {
  NEW_RESOURCE_SUBMISSION_FILTERS,
  RESOURCE_UPDATE_FILTERS,
  reviewSubmissionsUrl,
} from '@/features/staff/submissions/reviewQueueNavigation'

/**
 * Staff Dashboard — KPI cards match the approved layout.
 * Published Resources + Pending Review use GET /dashboard/stats when available.
 * Resource Updates stays on placeholder until the API exposes that count.
 */
export function StaffHomePage() {
  const { status, stats, error, isForbidden, reload } = useDashboardStats()

  const isLoading = status === 'loading'
  const unavailable = status === 'error'
  const showAnalyticsBanner = status === 'error'

  return (
    <PageShell title="Dashboard">
      <div className="space-y-section">
        <DashboardHeader />

        {showAnalyticsBanner ? (
          <div
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
            role="alert"
          >
            <div className="flex min-w-0 items-start gap-3">
              {isForbidden ? (
                <TriangleAlert
                  className="mt-0.5 h-5 w-5 shrink-0 text-pending"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : (
                <AlertCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-danger"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0 space-y-1">
                <p className="font-heading text-sm font-semibold text-foreground">
                  {isForbidden
                    ? 'Dashboard analytics temporarily unavailable'
                    : 'Unable to load dashboard analytics'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isForbidden
                    ? 'Your account can open the dashboard, but the analytics API currently only allows moderator and administrator roles. This is a temporary backend limitation — KPI values are hidden until access is enabled.'
                    : (error ??
                      'Something went wrong while loading analytics. The rest of the dashboard remains available.')}
                </p>
              </div>
            </div>
            {!isForbidden ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 self-start"
                onClick={reload}
              >
                Try again
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DashboardStatCard
            title="Published Resources"
            value={stats?.published_resources ?? null}
            description="Active resources in the directory."
            icon={MapPin}
            accent="success"
            isLoading={isLoading}
            unavailable={unavailable}
          />
          <DashboardStatCard
            title="Pending Review"
            value={stats?.pending_submissions ?? null}
            description="New resource submissions."
            icon={ClipboardList}
            accent="primary"
            to={reviewSubmissionsUrl(NEW_RESOURCE_SUBMISSION_FILTERS)}
            isLoading={isLoading}
            unavailable={unavailable}
          />
          <DashboardStatCard
            title="Resource Updates"
            value={PLACEHOLDER_STATS.resourceUpdates}
            description="Update requests in the queue."
            icon={FilePenLine}
            accent="danger"
            showHighPriorityLabel
            to={reviewSubmissionsUrl(RESOURCE_UPDATE_FILTERS)}
          />
        </div>

        <DashboardQuickActions actions={PLACEHOLDER_QUICK_ACTIONS} />

        <div className="grid gap-section lg:grid-cols-2">
          <DashboardCategoryCard segments={PLACEHOLDER_CATEGORY_SEGMENTS} />
          <DashboardRecentSubmissions
            submissions={PLACEHOLDER_RECENT_SUBMISSIONS}
          />
        </div>
      </div>
    </PageShell>
  )
}
