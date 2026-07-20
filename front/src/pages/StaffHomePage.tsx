import { ClipboardList, FilePenLine, MapPin } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
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
import {
  NEW_RESOURCE_SUBMISSION_FILTERS,
  RESOURCE_UPDATE_FILTERS,
  reviewSubmissionsUrl,
} from '@/features/staff/submissions/reviewQueueNavigation'

export function StaffHomePage() {
  return (
    <PageShell title="Dashboard">
      <div className="space-y-section">
        <DashboardHeader />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DashboardStatCard
            title="Published Resources"
            value={PLACEHOLDER_STATS.publishedResources}
            description="Active resources in the directory."
            icon={MapPin}
            accent="success"
          />
          <DashboardStatCard
            title="Pending Review"
            value={PLACEHOLDER_STATS.pendingReviews}
            description="New resource submissions."
            icon={ClipboardList}
            accent="primary"
            to={reviewSubmissionsUrl(NEW_RESOURCE_SUBMISSION_FILTERS)}
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
