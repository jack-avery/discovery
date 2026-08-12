import { useMemo, useState } from 'react'
import { AlertCircle, ClipboardList, FilePenLine, MapPin, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { PageShell } from '@/components/shared/PageShell'
import { Button } from '@/components/ui'
import { CategoryManagePanel } from '@/features/staff/categories'
import { TagManagePanel } from '@/features/staff/tags'
import {
  DashboardCategoryCard,
  DashboardHeader,
  DashboardQuickActions,
  DashboardStatCard,
  PLACEHOLDER_QUICK_ACTIONS,
  type CategoryChartSegment,
} from '@/features/staff/dashboard'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import {
  NEW_RESOURCE_SUBMISSION_FILTERS,
  RESOURCE_UPDATE_FILTERS,
  reviewSubmissionsUrl,
} from '@/features/staff/submissions/reviewQueueNavigation'

/** Chart bars use theme colour; `color` is retained for the segment type. */
const CATEGORY_BAR_COLOR = 'var(--primary)'

/**
 * Staff Dashboard — KPI cards match the approved layout.
 * Counts come from GET /dashboard/stats when available.
 */
export function StaffHomePage() {
  const { permissions } = useAuth()
  const { status, stats, error, isForbidden, reload } = useDashboardStats()
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)

  const isLoading = status === 'loading'
  const unavailable = status === 'error'
  const showAnalyticsBanner = status === 'error'

  const pendingReviewCount = stats?.pending_new_submissions ?? null
  const resourceUpdateCount = stats?.pending_resource_updates ?? null

  const categorySegments = useMemo<CategoryChartSegment[]>(() => {
    if (!stats?.category_distribution) return []
    return stats.category_distribution.map((row) => ({
      label: row.name,
      value: row.resource_count,
      color: CATEGORY_BAR_COLOR,
    }))
  }, [stats])

  const quickActions = useMemo(
    () =>
      PLACEHOLDER_QUICK_ACTIONS.map((action) => {
        if (action.id === 'manage-categories') {
          return {
            ...action,
            onClick: () => {
              if (permissions.canManageCategories) setCategoriesOpen(true)
            },
          }
        }
        if (action.id === 'manage-tags') {
          return {
            ...action,
            onClick: () => {
              if (permissions.canManageTags) setTagsOpen(true)
            },
          }
        }
        return action
      }),
    [permissions.canManageCategories, permissions.canManageTags],
  )

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
            value={pendingReviewCount}
            description="New resource submissions."
            icon={ClipboardList}
            accent="primary"
            to={reviewSubmissionsUrl(NEW_RESOURCE_SUBMISSION_FILTERS)}
            isLoading={isLoading}
            unavailable={unavailable}
          />
          <DashboardStatCard
            title="Resource Updates"
            value={resourceUpdateCount}
            description="Update requests in the queue."
            icon={FilePenLine}
            accent="danger"
            showHighPriorityLabel
            to={reviewSubmissionsUrl(RESOURCE_UPDATE_FILTERS)}
            isLoading={isLoading}
            unavailable={unavailable}
          />
        </div>

        <DashboardQuickActions actions={quickActions} />

        <section aria-labelledby="dashboard-analytics-heading">
          <div className="mb-4">
            <h3
              id="dashboard-analytics-heading"
              className="font-heading text-base font-semibold text-foreground"
            >
              Analytics
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Insights into your published resource directory.
            </p>
          </div>
          <DashboardCategoryCard
            segments={categorySegments}
            isLoading={isLoading}
            unavailable={unavailable}
          />
        </section>
      </div>

      {permissions.canManageCategories ? (
        <CategoryManagePanel
          open={categoriesOpen}
          onClose={() => setCategoriesOpen(false)}
        />
      ) : null}
      {permissions.canManageTags ? (
        <TagManagePanel open={tagsOpen} onClose={() => setTagsOpen(false)} />
      ) : null}
    </PageShell>
  )
}
